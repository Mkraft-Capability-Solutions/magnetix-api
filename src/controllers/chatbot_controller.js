const chatbotService = require('../services/chatbot_service');

/**
 * Create a new chatbot conversation
 */
exports.createConversation = async (req, res) => {
  try {
    const conversation = await chatbotService.createConversation(req.user.uuid);
    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, message: 'Failed to create conversation' });
  }
};

/**
 * Get user's conversations
 */
exports.getConversations = async (req, res) => {
  try {
    const conversations = await chatbotService.getUserConversations(req.user.uuid);
    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

/**
 * Get a single conversation with messages
 */
exports.getConversation = async (req, res) => {
  try {
    const { uuid } = req.params;
    const result = await chatbotService.getConversationMessages(uuid, req.user.uuid);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'Conversation not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
  }
};

/**
 * Send a message and get AI response
 */
exports.sendMessage = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const result = await chatbotService.sendMessage(uuid, req.user.uuid, message.trim());
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'Conversation not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === 'Conversation is no longer active') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to process message' });
  }
};

/**
 * Explicitly escalate conversation to a support ticket
 */
exports.escalateToTicket = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { subject, category, description } = req.body;

    const ticket = await chatbotService.escalateToTicket(uuid, req.user.uuid, {
      subject: subject || 'Support request from AI Chatbot',
      category: category || 'general',
      description: description || '',
    });

    res.json({ success: true, data: ticket, message: `Ticket ${ticket.ticket_number} created successfully` });
  } catch (error) {
    console.error('Error escalating to ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
};

/**
 * Close a conversation
 */
exports.closeConversation = async (req, res) => {
  try {
    const { uuid } = req.params;
    await chatbotService.closeConversation(uuid, req.user.uuid);
    res.json({ success: true, message: 'Conversation closed' });
  } catch (error) {
    if (error.message === 'Conversation not found or already closed') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Error closing conversation:', error);
    res.status(500).json({ success: false, message: 'Failed to close conversation' });
  }
};
