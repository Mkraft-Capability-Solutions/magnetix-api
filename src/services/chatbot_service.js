const { v4: uuidv4 } = require('uuid');
const { promisePool } = require('../config/db');
const geminiAIService = require('./gemini/gemini_ai_service');
const supportService = require('./support_service');

// Stop words to filter out from keyword extraction
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
  'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'don',
  'should', 'now', 'also', 'get', 'got', 'please', 'help', 'need', 'want',
]);

/**
 * Create a new chatbot conversation
 */
exports.createConversation = async (userId) => {
  const uuid = uuidv4();
  await promisePool.query(
    'INSERT INTO chatbot_conversations (uuid, user_id) VALUES (?, ?)',
    [uuid, userId]
  );
  return { uuid, title: 'New Chat', status: 'active', created_at: new Date() };
};

/**
 * Get user's chatbot conversations
 */
exports.getUserConversations = async (userId) => {
  const [conversations] = await promisePool.query(`
    SELECT
      c.uuid, c.title, c.status, c.ticket_id, c.created_at, c.updated_at,
      (SELECT content FROM chatbot_messages WHERE conversation_id = c.uuid ORDER BY created_at DESC LIMIT 1) as last_message
    FROM chatbot_conversations c
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC
    LIMIT 50
  `, [userId]);
  return conversations;
};

/**
 * Get conversation messages
 */
exports.getConversationMessages = async (conversationUuid, userId) => {
  // Verify ownership
  const [convRows] = await promisePool.query(
    'SELECT id, uuid, title, status, ticket_id FROM chatbot_conversations WHERE uuid = ? AND user_id = ?',
    [conversationUuid, userId]
  );
  if (convRows.length === 0) {
    throw new Error('Conversation not found');
  }

  const [messages] = await promisePool.query(
    'SELECT id, role, content, metadata, created_at FROM chatbot_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationUuid]
  );

  return { conversation: convRows[0], messages };
};

/**
 * Send a message and get AI response
 */
exports.sendMessage = async (conversationUuid, userId, userMessage) => {
  // Verify ownership and status
  const [convRows] = await promisePool.query(
    'SELECT id, uuid, title, status FROM chatbot_conversations WHERE uuid = ? AND user_id = ?',
    [conversationUuid, userId]
  );
  if (convRows.length === 0) {
    throw new Error('Conversation not found');
  }
  if (convRows[0].status !== 'active') {
    throw new Error('Conversation is no longer active');
  }

  // Save user message
  await promisePool.query(
    'INSERT INTO chatbot_messages (conversation_id, role, content) VALUES (?, ?, ?)',
    [conversationUuid, 'user', userMessage]
  );

  // Build knowledge context
  const knowledgeContext = await _buildKnowledgeContext(userMessage);

  // Build system prompt
  const systemPrompt = _buildSystemPrompt(knowledgeContext);

  // Get conversation history (last 20 messages)
  const [historyRows] = await promisePool.query(
    'SELECT role, content FROM chatbot_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20',
    [conversationUuid]
  );

  // Call Gemini
  let aiResponse;
  try {
    aiResponse = await geminiAIService.generateChatResponse(systemPrompt, historyRows);
  } catch (error) {
    console.error('Chatbot AI error:', error.message);
    aiResponse = "I'm sorry, I'm having trouble processing your request right now. Would you like me to create a support ticket so our team can help you?";
  }

  // Check for ticket creation markers
  let ticketCreated = null;
  const ticketMatch = aiResponse.match(/\[TICKET_REQUEST\](.*?)\[\/TICKET_REQUEST\]/s);
  if (ticketMatch) {
    try {
      const ticketData = JSON.parse(ticketMatch[1]);
      ticketCreated = await exports.escalateToTicket(conversationUuid, userId, ticketData);
      // Remove marker from displayed message
      aiResponse = aiResponse.replace(/\[TICKET_REQUEST\].*?\[\/TICKET_REQUEST\]/s, '').trim();
      if (!aiResponse) {
        aiResponse = `I've created a support ticket for you. Your ticket number is **${ticketCreated.ticket_number}**. Our team will follow up shortly.`;
      }
    } catch (parseError) {
      console.error('Failed to parse ticket request:', parseError.message);
    }
  }

  // Save assistant message
  const metadata = ticketCreated ? JSON.stringify({ ticket: { id: ticketCreated.id, ticket_number: ticketCreated.ticket_number } }) : null;
  await promisePool.query(
    'INSERT INTO chatbot_messages (conversation_id, role, content, metadata) VALUES (?, ?, ?, ?)',
    [conversationUuid, 'assistant', aiResponse, metadata]
  );

  // Update conversation title if first exchange
  if (convRows[0].title === 'New Chat') {
    const title = userMessage.length > 60 ? userMessage.substring(0, 57) + '...' : userMessage;
    await promisePool.query(
      'UPDATE chatbot_conversations SET title = ? WHERE uuid = ?',
      [title, conversationUuid]
    );
  }

  // Update timestamp
  await promisePool.query(
    'UPDATE chatbot_conversations SET updated_at = NOW() WHERE uuid = ?',
    [conversationUuid]
  );

  return {
    message: {
      role: 'assistant',
      content: aiResponse,
      metadata: ticketCreated ? { ticket: { id: ticketCreated.id, ticket_number: ticketCreated.ticket_number } } : null,
      created_at: new Date()
    },
    ticketCreated: ticketCreated ? {
      id: ticketCreated.id,
      ticket_number: ticketCreated.ticket_number,
      subject: ticketCreated.subject
    } : null
  };
};

/**
 * Escalate conversation to a support ticket
 */
exports.escalateToTicket = async (conversationUuid, userId, ticketData) => {
  // Get conversation messages for description
  const [messages] = await promisePool.query(
    'SELECT role, content, created_at FROM chatbot_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20',
    [conversationUuid]
  );

  // Build transcript
  const transcript = messages.map(m => {
    const label = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'AI Assistant' : 'System';
    return `${label}: ${m.content}`;
  }).join('\n\n');

  const description = `[Auto-created from AI Chatbot]\n\n${ticketData.description || ''}\n\n--- Chat Transcript ---\n${transcript}`.trim();

  // Get user info
  const [userRows] = await promisePool.query(
    'SELECT uuid, email FROM users WHERE uuid = ?',
    [userId]
  );
  const user = userRows[0];

  // Create ticket using existing support service
  const ticket = await supportService.createTicket({
    user_id: userId,
    subject: ticketData.subject || 'Support request from AI Chatbot',
    description: description.substring(0, 5000),
    category: ticketData.category || 'general',
    priority: ticketData.priority || 'medium',
  }, user);

  // Update conversation status
  await promisePool.query(
    'UPDATE chatbot_conversations SET status = ?, ticket_id = ? WHERE uuid = ?',
    ['escalated', ticket.id, conversationUuid]
  );

  // Save system message
  await promisePool.query(
    'INSERT INTO chatbot_messages (conversation_id, role, content, metadata) VALUES (?, ?, ?, ?)',
    [conversationUuid, 'system', `Support ticket ${ticket.ticket_number} has been created. Our team will follow up shortly.`, JSON.stringify({ ticket: { id: ticket.id, ticket_number: ticket.ticket_number } })]
  );

  return ticket;
};

/**
 * Close a conversation
 */
exports.closeConversation = async (conversationUuid, userId) => {
  const [result] = await promisePool.query(
    'UPDATE chatbot_conversations SET status = ?, closed_at = NOW() WHERE uuid = ? AND user_id = ? AND status = ?',
    ['closed', conversationUuid, userId, 'active']
  );
  if (result.affectedRows === 0) {
    throw new Error('Conversation not found or already closed');
  }
  return { success: true };
};

// ==========================================
// Private Helpers
// ==========================================

/**
 * Build knowledge context from KB articles, FAQs, and courses
 */
async function _buildKnowledgeContext(userMessage) {
  const keywords = _extractKeywords(userMessage);
  if (keywords.length === 0) return '';

  const sections = [];

  try {
    // Search KB articles
    const articleConditions = keywords.map(() => '(title LIKE ? OR content LIKE ? OR tags LIKE ?)').join(' OR ');
    const articleParams = keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`, `%${kw}%`]);
    const [articles] = await promisePool.query(
      `SELECT title, excerpt, content FROM kb_articles WHERE is_deleted = 0 AND status = 'published' AND (${articleConditions}) LIMIT 3`,
      articleParams
    );
    if (articles.length > 0) {
      sections.push('KNOWLEDGE BASE ARTICLES:');
      articles.forEach(a => {
        const preview = a.excerpt || (a.content ? a.content.substring(0, 300) : '');
        sections.push(`- ${a.title}: ${preview}`);
      });
    }
  } catch (e) { /* kb_articles may not exist */ }

  try {
    // Search KB FAQs
    const faqConditions = keywords.map(() => '(question LIKE ? OR answer LIKE ?)').join(' OR ');
    const faqParams = keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`]);
    const [faqs] = await promisePool.query(
      `SELECT question, answer FROM kb_faqs WHERE is_deleted = 0 AND is_active = 1 AND (${faqConditions}) LIMIT 5`,
      faqParams
    );
    if (faqs.length > 0) {
      sections.push('\nFREQUENTLY ASKED QUESTIONS:');
      faqs.forEach(f => {
        sections.push(`- Q: ${f.question}\n  A: ${f.answer.substring(0, 200)}`);
      });
    }
  } catch (e) { /* kb_faqs may not exist */ }

  try {
    // Search courses
    const courseConditions = keywords.map(() => '(title LIKE ? OR description LIKE ?)').join(' OR ');
    const courseParams = keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`]);
    const [courses] = await promisePool.query(
      `SELECT title, description FROM course WHERE is_deleted = 0 AND (${courseConditions}) LIMIT 5`,
      courseParams
    );
    if (courses.length > 0) {
      sections.push('\nAVAILABLE COURSES:');
      courses.forEach(c => {
        const desc = c.description ? c.description.substring(0, 150) : '';
        sections.push(`- ${c.title}: ${desc}`);
      });
    }
  } catch (e) { /* course table may not exist */ }

  // Also include hardcoded FAQs from support service
  try {
    const hardcodedFaqs = await supportService.getFAQs();
    const matchingFaqs = hardcodedFaqs.filter(faq =>
      keywords.some(kw => faq.question.toLowerCase().includes(kw) || faq.answer.toLowerCase().includes(kw))
    ).slice(0, 3);
    if (matchingFaqs.length > 0) {
      sections.push('\nSUPPORT FAQS:');
      matchingFaqs.forEach(f => {
        sections.push(`- Q: ${f.question}\n  A: ${f.answer.substring(0, 200)}`);
      });
    }
  } catch (e) { /* ignore */ }

  // Cap total context
  const context = sections.join('\n');
  return context.substring(0, 4000);
}

/**
 * Extract meaningful keywords from user message
 */
function _extractKeywords(message) {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 8);
}

/**
 * Build the system prompt for the chatbot
 */
function _buildSystemPrompt(knowledgeContext) {
  return `You are Mkraft Assistant, an AI support bot for the Mkraft Learning Management System (LMS).

ROLE:
- Help users with questions about courses, platform features, account settings, and technical issues.
- Answer based ONLY on the provided knowledge context. Do not fabricate information.
- Be concise, friendly, and professional. Keep responses under 200 words when possible.

CAPABILITIES:
- Answer questions about platform features, courses, enrollment, assessments, certificates, and learning paths.
- Guide users through common tasks (password reset, enrollment, profile updates, finding courses).
- Provide information from knowledge base articles and FAQs.

LIMITATIONS:
- You CANNOT make changes to accounts, reset passwords, process refunds, or access user-specific data.
- If you cannot find relevant information in the context, be honest about it.

TICKET ESCALATION:
When you determine you cannot help the user (after at least one attempt to assist), suggest creating a support ticket.
If the user agrees OR explicitly asks to create a ticket / talk to someone / get human help, respond with this marker embedded in your message:
[TICKET_REQUEST]{"subject":"<brief summary of the issue>","category":"<technical|account|billing|course|general>"}[/TICKET_REQUEST]

The marker will be processed automatically — just include it naturally in your response.

KNOWLEDGE CONTEXT:
---
${knowledgeContext || 'No specific context available for this query.'}
---

Answer the user's question based on the above context. If the context does not contain relevant information, say so honestly and offer to create a support ticket.`;
}
