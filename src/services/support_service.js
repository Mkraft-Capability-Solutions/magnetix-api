const { promisePool } = require('../config/db');
const { emitTicketUpdate, emitNewTicketToAgents } = require('../socket/handlers/ticketHandlers');

/**
 * Generate unique ticket number in format: TKT-YYYYMMDD-####
 */
async function generateTicketNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Get count of tickets created today
  const [rows] = await promisePool.query(
    `SELECT COUNT(*) as count FROM support_tickets
     WHERE ticket_number LIKE ?`,
    [`TKT-${dateStr}-%`]
  );

  const count = rows[0].count + 1;
  const ticketNumber = `TKT-${dateStr}-${String(count).padStart(4, '0')}`;

  return ticketNumber;
}

/**
 * Get FAQs (hardcoded for now, can be moved to database later)
 */
exports.getFAQs = async () => {
  return [
    // Account FAQs
    {
      id: 1,
      question: 'How do I reset my password?',
      answer:
        'You can reset your password by clicking "Forgot Password" on the login page and following the instructions sent to your email.',
      category: 'Account',
    },
    {
      id: 2,
      question: 'How do I update my profile information?',
      answer:
        'Navigate to your profile settings by clicking on your avatar in the top right corner, then select "Edit Profile" to update your information.',
      category: 'Account',
    },
    {
      id: 3,
      question: 'How do I change my email address?',
      answer:
        'Go to Account Settings, click on "Email Settings", enter your new email address, and verify it through the confirmation email sent to your new address.',
      category: 'Account',
    },

    // Billing FAQs
    {
      id: 4,
      question: 'What payment methods do you accept?',
      answer: 'We accept credit cards, debit cards, PayPal, and wire transfers for course payments.',
      category: 'Billing',
    },
    {
      id: 5,
      question: 'Can I get a refund for a course?',
      answer:
        'Refunds are available within 14 days of purchase if you have not completed more than 20% of the course content.',
      category: 'Billing',
    },
    {
      id: 6,
      question: 'How do I view my billing history?',
      answer:
        'Access your billing history by going to Account Settings > Billing & Payments. You can view all past transactions and download invoices.',
      category: 'Billing',
    },

    // Security FAQs
    {
      id: 7,
      question: 'How do I enable two-factor authentication?',
      answer:
        'Go to Account Settings > Security, then enable Two-Factor Authentication. Follow the prompts to set up your preferred authentication method (SMS or authenticator app).',
      category: 'Security',
    },
    {
      id: 8,
      question: 'Is my personal data secure?',
      answer:
        'Yes, we use industry-standard encryption (SSL/TLS) to protect your data. All sensitive information is encrypted both in transit and at rest.',
      category: 'Security',
    },
    {
      id: 9,
      question: 'What should I do if I suspect unauthorized access to my account?',
      answer:
        'Immediately change your password, enable two-factor authentication, and contact our support team. We will help secure your account and investigate any suspicious activity.',
      category: 'Security',
    },

    // General FAQs
    {
      id: 10,
      question: 'How do I enroll in a course?',
      answer:
        'Browse available courses in the catalog, click on the course you want, and click the "Enroll" button. Some courses may require approval from your administrator.',
      category: 'General',
    },
    {
      id: 11,
      question: 'Can I access courses on mobile devices?',
      answer:
        'Yes, our platform is fully responsive and works on all devices including smartphones and tablets. You can also download our mobile app from the App Store or Google Play.',
      category: 'General',
    },
    {
      id: 12,
      question: 'How do I track my learning progress?',
      answer:
        'Your learning progress is automatically tracked and can be viewed on your dashboard. You can see completion percentages, certificates earned, and upcoming deadlines.',
      category: 'General',
    },

    // Support FAQs
    {
      id: 13,
      question: 'How do I contact support?',
      answer:
        'You can use the live chat feature on this page, submit a ticket via "Write Your Query", or call us at the number provided. Our support team is available 24/7.',
      category: 'Support',
    },
    {
      id: 14,
      question: 'What are your support hours?',
      answer:
        'Our support team is available 24/7 via chat and email. Phone support is available Monday-Friday, 9:00 AM - 6:00 PM EST.',
      category: 'Support',
    },
    {
      id: 15,
      question: 'How long does it take to get a response?',
      answer:
        'Chat responses are typically within 2-5 minutes during business hours. Email and ticket responses are usually within 24 hours. Urgent issues are prioritized.',
      category: 'Support',
    },
  ];
};

/**
 * Get contact information (hardcoded for now, can be moved to database/config later)
 */
exports.getContactInfo = async () => {
  return {
    phone: '+1 (555) 123-4567',
    email: 'support@magnetix.com',
    hours: 'Monday - Friday: 9:00 AM - 6:00 PM EST',
    address: '123 Learning Street, Education City, EC 12345',
  };
};

/**
 * Get count of available support agents
 */
exports.getAvailableAgentsCount = async () => {
  const [rows] = await promisePool.query(
    `SELECT COUNT(*) as available_count
     FROM support_agent_status
     WHERE is_online = TRUE AND status = 'available'
     AND current_active_chats < max_concurrent_chats`
  );

  const [totalRows] = await promisePool.query(
    `SELECT COUNT(*) as total_count
     FROM support_agent_status
     WHERE is_online = TRUE`
  );

  return {
    available: rows[0].available_count,
    online: totalRows[0].total_count,
  };
};

// ==========================================
// Ticket Services
// ==========================================

/**
 * Create a new support ticket
 */
exports.createTicket = async (ticketData, user) => {
  const ticketNumber = await generateTicketNumber();

  const [result] = await promisePool.query(
    `INSERT INTO support_tickets
     (ticket_number, user_id, subject, description, category, priority, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', NOW(), NOW())`,
    [
      ticketNumber,
      ticketData.user_id,
      ticketData.subject,
      ticketData.description,
      ticketData.category,
      ticketData.priority,
    ]
  );

  const ticketId = result.insertId;

  // Emit new ticket to all agents via Socket.io
  emitNewTicketToAgents({
    id: ticketId,
    ticket_number: ticketNumber,
    subject: ticketData.subject,
    category: ticketData.category,
    priority: ticketData.priority,
    user: {
      uuid: user.uuid,
      email: user.email,
    },
  });

  return {
    id: ticketId,
    ticket_number: ticketNumber,
    subject: ticketData.subject,
    description: ticketData.description,
    category: ticketData.category,
    priority: ticketData.priority,
    status: 'open',
    created_at: new Date(),
  };
};

/**
 * Get user's support tickets
 */
exports.getUserTickets = async (userId, status) => {
  let query = `
    SELECT
      t.id, t.ticket_number, t.subject, t.category, t.priority, t.status,
      t.created_at, t.updated_at, t.resolved_at, t.closed_at,
      (SELECT COUNT(*) FROM ticket_replies WHERE ticket_id = t.id) as reply_count,
      (SELECT COUNT(*) FROM ticket_replies WHERE ticket_id = t.id AND user_type = 'agent' AND created_at > (
        SELECT COALESCE(MAX(created_at), '1970-01-01') FROM ticket_replies WHERE ticket_id = t.id AND user_type = 'user'
      )) as unread_replies
    FROM support_tickets t
    WHERE t.user_id = ?
  `;

  const params = [userId];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  query += ' ORDER BY t.created_at DESC';

  const [tickets] = await promisePool.query(query, params);
  return tickets;
};

/**
 * Get ticket details with all replies
 */
exports.getTicketDetails = async (ticketId, userId, roleId) => {
  // Get ticket
  const [tickets] = await promisePool.query(
    `SELECT
      t.*,
      u.email as user_email,
      a.email as assigned_agent_email
     FROM support_tickets t
     JOIN users u ON t.user_id = u.uuid
     LEFT JOIN users a ON t.assigned_to = a.uuid
     WHERE t.id = ?`,
    [ticketId]
  );

  if (tickets.length === 0) {
    return null;
  }

  const ticket = tickets[0];

  // Check authorization
  if (ticket.user_id !== userId && ![3, 4].includes(roleId)) {
    throw new Error('Not authorized to view this ticket');
  }

  // Get replies (exclude internal notes for non-admin users)
  let repliesQuery = `
    SELECT
      r.id, r.message, r.user_type, r.is_internal, r.created_at,
      u.email as user_email
    FROM ticket_replies r
    JOIN users u ON r.user_id = u.uuid
    WHERE r.ticket_id = ?
  `;

  if (![3, 4].includes(roleId)) {
    repliesQuery += ' AND r.is_internal = FALSE';
  }

  repliesQuery += ' ORDER BY r.created_at ASC';

  const [replies] = await promisePool.query(repliesQuery, [ticketId]);

  return {
    ...ticket,
    replies,
  };
};

/**
 * Add a reply to a ticket
 */
exports.addTicketReply = async (ticketId, userId, roleId, message, isInternal = false) => {
  // Get ticket
  const [tickets] = await promisePool.query(
    `SELECT user_id, status FROM support_tickets WHERE id = ?`,
    [ticketId]
  );

  if (tickets.length === 0) {
    return null;
  }

  const ticket = tickets[0];

  // Check authorization
  if (ticket.user_id !== userId && ![3, 4].includes(roleId)) {
    throw new Error('Not authorized to reply to this ticket');
  }

  // Check if ticket is closed
  if (ticket.status === 'closed' && ![3, 4].includes(roleId)) {
    throw new Error('Cannot reply to a closed ticket');
  }

  const userType = [3, 4].includes(roleId) ? 'agent' : 'user';

  // Insert reply
  const [result] = await promisePool.query(
    `INSERT INTO ticket_replies
     (ticket_id, user_id, user_type, message, is_internal, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [ticketId, userId, userType, message, isInternal]
  );

  // Update ticket updated_at
  await promisePool.query(
    `UPDATE support_tickets SET updated_at = NOW() WHERE id = ?`,
    [ticketId]
  );

  // If ticket was pending_user and user replied, change to in_progress
  if (ticket.status === 'pending_user' && userType === 'user') {
    await promisePool.query(
      `UPDATE support_tickets SET status = 'in_progress' WHERE id = ?`,
      [ticketId]
    );
  }

  // Emit real-time update via Socket.io
  if (!isInternal) {
    emitTicketUpdate(ticketId, 'new_reply', {
      replyId: result.insertId,
      userType,
      message,
      timestamp: new Date(),
    });
  }

  const [replyData] = await promisePool.query(
    `SELECT r.*, u.email as user_email
     FROM ticket_replies r
     JOIN users u ON r.user_id = u.uuid
     WHERE r.id = ?`,
    [result.insertId]
  );

  return replyData[0];
};

/**
 * Close a ticket
 */
exports.closeTicket = async (ticketId, userId, roleId) => {
  // Get ticket
  const [tickets] = await promisePool.query(
    `SELECT user_id, status FROM support_tickets WHERE id = ?`,
    [ticketId]
  );

  if (tickets.length === 0) {
    throw new Error('Ticket not found');
  }

  const ticket = tickets[0];

  // Only admins (role 3, 4) can close tickets
  if (![3, 4].includes(roleId)) {
    throw new Error('Only admins can close tickets');
  }

  // Update ticket status
  await promisePool.query(
    `UPDATE support_tickets
     SET status = 'closed', closed_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [ticketId]
  );

  // Emit real-time update
  emitTicketUpdate(ticketId, 'status_change', {
    status: 'closed',
    timestamp: new Date(),
  });
};

// ==========================================
// Conversation Services
// ==========================================

/**
 * Get user's chat conversations
 */
exports.getUserConversations = async (userId, status) => {
  let query = `
    SELECT
      c.conversation_id, c.status, c.started_at, c.last_message_at, c.closed_at, c.rating,
      a.email as agent_email,
      (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.conversation_id AND is_read = FALSE AND sender_id != ?) as unread_count,
      (SELECT content FROM support_messages WHERE conversation_id = c.conversation_id ORDER BY sent_at DESC LIMIT 1) as last_message
    FROM support_conversations c
    LEFT JOIN users a ON c.assigned_agent_id = a.uuid
    WHERE c.user_id = ?
  `;

  const params = [userId, userId];

  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }

  query += ' ORDER BY c.last_message_at DESC';

  const [conversations] = await promisePool.query(query, params);
  return conversations;
};

/**
 * Get messages for a conversation
 */
exports.getConversationMessages = async (conversationId, userId, roleId, limit, offset) => {
  // Verify conversation access
  const [conversations] = await promisePool.query(
    `SELECT user_id, assigned_agent_id FROM support_conversations WHERE conversation_id = ?`,
    [conversationId]
  );

  if (conversations.length === 0) {
    throw new Error('Conversation not found');
  }

  const conversation = conversations[0];

  if (
    conversation.user_id !== userId &&
    conversation.assigned_agent_id !== userId &&
    ![3, 4].includes(roleId)
  ) {
    throw new Error('Not authorized to view this conversation');
  }

  // Get messages
  const [messages] = await promisePool.query(
    `SELECT
      m.message_id, m.sender_id, m.sender_type, m.message_type,
      m.content, m.file_url, m.file_name, m.file_size, m.file_type,
      m.is_read, m.sent_at,
      u.email as sender_email, u.role_id as sender_role
     FROM support_messages m
     JOIN users u ON m.sender_id = u.uuid
     WHERE m.conversation_id = ?
     ORDER BY m.sent_at ASC
     LIMIT ? OFFSET ?`,
    [conversationId, limit, offset]
  );

  return messages;
};

// ==========================================
// Admin Services
// ==========================================

/**
 * Get all tickets with filters (Admin)
 */
exports.getAllTickets = async (filters) => {
  const { status, priority, assigned_to, category, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = `
    SELECT
      t.id, t.ticket_number, t.subject, t.category, t.priority, t.status,
      t.created_at, t.updated_at, t.resolved_at, t.closed_at,
      u.email as user_email,
      a.email as assigned_agent_email,
      (SELECT COUNT(*) FROM ticket_replies WHERE ticket_id = t.id) as reply_count
    FROM support_tickets t
    JOIN users u ON t.user_id = u.uuid
    LEFT JOIN users a ON t.assigned_to = a.uuid
    WHERE 1=1
  `;

  const params = [];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }

  if (assigned_to) {
    query += ' AND t.assigned_to = ?';
    params.push(assigned_to);
  }

  if (category) {
    query += ' AND t.category = ?';
    params.push(category);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [tickets] = await promisePool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM support_tickets t WHERE 1=1';
  const countParams = [];

  if (status) {
    countQuery += ' AND t.status = ?';
    countParams.push(status);
  }

  if (priority) {
    countQuery += ' AND t.priority = ?';
    countParams.push(priority);
  }

  if (assigned_to) {
    countQuery += ' AND t.assigned_to = ?';
    countParams.push(assigned_to);
  }

  if (category) {
    countQuery += ' AND t.category = ?';
    countParams.push(category);
  }

  const [countRows] = await promisePool.query(countQuery, countParams);

  return {
    tickets,
    pagination: {
      total: countRows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
};

/**
 * Assign ticket to an agent
 */
exports.assignTicket = async (ticketId, agentId) => {
  // Verify ticket exists
  const [tickets] = await promisePool.query(
    `SELECT id, status FROM support_tickets WHERE id = ?`,
    [ticketId]
  );

  if (tickets.length === 0) {
    throw new Error('Ticket not found');
  }

  // Verify agent exists and is trainer/admin/super admin
  const [agents] = await promisePool.query(
    `SELECT uuid, role_id FROM users WHERE uuid = ? AND role_id IN (2, 3, 4)`,
    [agentId]
  );

  if (agents.length === 0) {
    throw new Error('Agent not found or not authorized');
  }

  // Update ticket
  await promisePool.query(
    `UPDATE support_tickets
     SET assigned_to = ?, status = 'assigned', updated_at = NOW()
     WHERE id = ?`,
    [agentId, ticketId]
  );

  // Emit real-time update
  emitTicketUpdate(ticketId, 'assigned', {
    assigned_to: agentId,
    status: 'assigned',
    timestamp: new Date(),
  });
};

/**
 * Update ticket status
 */
exports.updateTicketStatus = async (ticketId, status, resolutionNotes) => {
  // Verify ticket exists
  const [tickets] = await promisePool.query(
    `SELECT id FROM support_tickets WHERE id = ?`,
    [ticketId]
  );

  if (tickets.length === 0) {
    throw new Error('Ticket not found');
  }

  const updates = ['status = ?', 'updated_at = NOW()'];
  const params = [status];

  if (status === 'resolved' || status === 'closed') {
    updates.push(`${status}_at = NOW()`);
  }

  if (resolutionNotes) {
    updates.push('resolution_notes = ?');
    params.push(resolutionNotes);
  }

  params.push(ticketId);

  await promisePool.query(
    `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  // Emit real-time update
  emitTicketUpdate(ticketId, 'status_change', {
    status,
    resolution_notes: resolutionNotes,
    timestamp: new Date(),
  });
};

/**
 * Get all conversations with filters (Admin)
 */
exports.getAllConversations = async (filters) => {
  const { status, assigned_to, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = `
    SELECT
      c.conversation_id, c.status, c.started_at, c.last_message_at, c.closed_at, c.rating,
      u.email as user_email,
      a.email as agent_email,
      (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.conversation_id) as message_count
    FROM support_conversations c
    JOIN users u ON c.user_id = u.uuid
    LEFT JOIN users a ON c.assigned_agent_id = a.uuid
    WHERE 1=1
  `;

  const params = [];

  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }

  if (assigned_to) {
    query += ' AND c.assigned_agent_id = ?';
    params.push(assigned_to);
  }

  query += ' ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [conversations] = await promisePool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM support_conversations c WHERE 1=1';
  const countParams = [];

  if (status) {
    countQuery += ' AND c.status = ?';
    countParams.push(status);
  }

  if (assigned_to) {
    countQuery += ' AND c.assigned_agent_id = ?';
    countParams.push(assigned_to);
  }

  const [countRows] = await promisePool.query(countQuery, countParams);

  return {
    conversations,
    pagination: {
      total: countRows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  };
};

/**
 * Get all support agents with their status
 */
exports.getAllAgents = async () => {
  const [agents] = await promisePool.query(
    `SELECT
      u.uuid, u.email,
      COALESCE(s.is_online, FALSE) as is_online,
      COALESCE(s.status, 'offline') as status,
      COALESCE(s.current_active_chats, 0) as current_active_chats,
      COALESCE(s.max_concurrent_chats, 5) as max_concurrent_chats,
      s.last_seen
     FROM users u
     LEFT JOIN support_agent_status s ON u.uuid = s.agent_id
     WHERE u.role_id IN (3, 4) AND u.is_deleted = 0
     ORDER BY s.is_online DESC, u.email ASC`
  );

  return agents;
};

/**
 * Update agent's maximum concurrent chats
 */
exports.updateAgentMaxChats = async (agentId, maxChats) => {
  // Verify agent exists
  const [agents] = await promisePool.query(
    `SELECT uuid FROM users WHERE uuid = ? AND role_id IN (3, 4)`,
    [agentId]
  );

  if (agents.length === 0) {
    throw new Error('Agent not found');
  }

  // Update or insert agent status
  await promisePool.query(
    `INSERT INTO support_agent_status (agent_id, max_concurrent_chats)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE max_concurrent_chats = ?`,
    [agentId, maxChats, maxChats]
  );
};

/**
 * Get assignable staff (trainers, admins, super admins)
 */
exports.getAssignableStaff = async () => {
  const [staff] = await promisePool.query(
    `SELECT uuid, email, role_id
     FROM users
     WHERE role_id IN (2, 3, 4) AND is_deleted = 0
     ORDER BY role_id DESC, email ASC`
  );
  return staff;
};

/**
 * Get support system statistics
 */
exports.getSupportStats = async () => {
  // Ticket stats
  const [ticketStats] = await promisePool.query(`
    SELECT
      COUNT(*) as total_tickets,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
      SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_tickets,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tickets,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_tickets,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_tickets,
      SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_tickets
    FROM support_tickets
  `);

  // Conversation stats
  const [conversationStats] = await promisePool.query(`
    SELECT
      COUNT(*) as total_conversations,
      SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting_conversations,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_conversations,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_conversations,
      AVG(rating) as avg_rating
    FROM support_conversations
  `);

  // Agent stats
  const [agentStats] = await promisePool.query(`
    SELECT
      COUNT(*) as total_agents,
      SUM(CASE WHEN is_online = TRUE THEN 1 ELSE 0 END) as online_agents,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_agents
    FROM support_agent_status
  `);

  return {
    tickets: ticketStats[0],
    conversations: conversationStats[0],
    agents: agentStats[0],
  };
};
