const supportService = require('../services/support_service');

/**
 * GET /support/faqs
 * Get list of frequently asked questions
 */
exports.getFAQs = async (req, res) => {
  try {
    const faqs = await supportService.getFAQs();
    res.json({ success: true, faqs });
  } catch (error) {
    console.error('Error in getFAQs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch FAQs' });
  }
};

/**
 * GET /support/contact-info
 * Get contact information
 */
exports.getContactInfo = async (req, res) => {
  try {
    const contactInfo = await supportService.getContactInfo();
    res.json({ success: true, contactInfo });
  } catch (error) {
    console.error('Error in getContactInfo:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contact information' });
  }
};

/**
 * GET /support/agent-status
 * Get available support agents count
 */
exports.getAgentStatus = async (req, res) => {
  try {
    const agentStatus = await supportService.getAvailableAgentsCount();
    res.json({ success: true, ...agentStatus });
  } catch (error) {
    console.error('Error in getAgentStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agent status' });
  }
};

// ==========================================
// Ticket Controllers
// ==========================================

/**
 * POST /support/tickets
 * Create a new support ticket
 */
exports.createTicket = async (req, res) => {
  try {
    const userId = req.user.uuid;
    const { subject, description, category, priority } = req.body;

    // Validation
    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Subject and description are required',
      });
    }

    const ticketData = {
      user_id: userId,
      subject,
      description,
      category: category || 'general',
      priority: priority || 'medium',
    };

    const ticket = await supportService.createTicket(ticketData, req.user);
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error('Error in createTicket:', error);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
};

/**
 * GET /support/tickets
 * Get user's support tickets
 */
exports.getUserTickets = async (req, res) => {
  try {
    const userId = req.user.uuid;
    const { status } = req.query;

    const tickets = await supportService.getUserTickets(userId, status);
    res.json({ success: true, tickets });
  } catch (error) {
    console.error('Error in getUserTickets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

/**
 * GET /support/tickets/:id
 * Get ticket details with all replies
 */
exports.getTicketDetails = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.uuid;
    const roleId = req.user.role_id;

    const ticket = await supportService.getTicketDetails(ticketId, userId, roleId);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error in getTicketDetails:', error);

    if (error.message === 'Not authorized to view this ticket') {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Failed to fetch ticket details' });
  }
};

/**
 * POST /support/tickets/:id/reply
 * Reply to a support ticket
 */
exports.addTicketReply = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.uuid;
    const roleId = req.user.role_id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const reply = await supportService.addTicketReply(ticketId, userId, roleId, message, false);

    if (!reply) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(201).json({ success: true, reply });
  } catch (error) {
    console.error('Error in addTicketReply:', error);

    if (error.message === 'Not authorized to reply to this ticket') {
      return res.status(403).json({ success: false, message: error.message });
    }

    if (error.message === 'Cannot reply to a closed ticket') {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Failed to add reply' });
  }
};

/**
 * PATCH /support/tickets/:id/close
 * Close a support ticket
 */
exports.closeTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.uuid;
    const roleId = req.user.role_id;

    await supportService.closeTicket(ticketId, userId, roleId);
    res.json({ success: true, message: 'Ticket closed successfully' });
  } catch (error) {
    console.error('Error in closeTicket:', error);

    if (error.message === 'Not authorized to close this ticket') {
      return res.status(403).json({ success: false, message: error.message });
    }

    if (error.message === 'Ticket not found') {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Failed to close ticket' });
  }
};

// ==========================================
// Conversation Controllers
// ==========================================

/**
 * GET /support/conversations
 * Get user's chat conversations
 */
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user.uuid;
    const { status } = req.query;

    const conversations = await supportService.getUserConversations(userId, status);
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

/**
 * GET /support/conversations/:id/messages
 * Get messages for a specific conversation
 */
exports.getConversationMessages = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.uuid;
    const roleId = req.user.role_id;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await supportService.getConversationMessages(
      conversationId,
      userId,
      roleId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error in getConversationMessages:', error);

    if (error.message === 'Not authorized to view this conversation') {
      return res.status(403).json({ success: false, message: error.message });
    }

    if (error.message === 'Conversation not found') {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

// ==========================================
// Admin Controllers
// ==========================================

/**
 * GET /support/admin/tickets
 * Get all support tickets with filters (Admin only)
 */
exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority, assigned_to, category, page = 1, limit = 20 } = req.query;

    const filters = {
      status,
      priority,
      assigned_to,
      category,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await supportService.getAllTickets(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in getAllTickets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

/**
 * PATCH /support/admin/tickets/:id/assign
 * Assign ticket to a support agent (Admin only)
 */
exports.assignTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { assigned_to } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ success: false, message: 'assigned_to is required' });
    }

    await supportService.assignTicket(ticketId, assigned_to);
    res.json({ success: true, message: 'Ticket assigned successfully' });
  } catch (error) {
    console.error('Error in assignTicket:', error);

    if (error.message === 'Ticket not found') {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (error.message === 'Agent not found or not authorized') {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Failed to assign ticket' });
  }
};

/**
 * PATCH /support/admin/tickets/:id/status
 * Update ticket status (Admin only)
 */
exports.updateTicketStatus = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { status, resolution_notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    const validStatuses = ['open', 'assigned', 'in_progress', 'pending_user', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await supportService.updateTicketStatus(ticketId, status, resolution_notes);
    res.json({ success: true, message: 'Ticket status updated successfully' });
  } catch (error) {
    console.error('Error in updateTicketStatus:', error);

    if (error.message === 'Ticket not found') {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Failed to update ticket status' });
  }
};

/**
 * POST /support/admin/tickets/:id/internal-note
 * Add internal note to ticket (Admin only)
 */
exports.addInternalNote = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.uuid;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const note = await supportService.addTicketReply(ticketId, userId, req.user.role_id, message, true);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.status(201).json({ success: true, note });
  } catch (error) {
    console.error('Error in addInternalNote:', error);
    res.status(500).json({ success: false, message: 'Failed to add internal note' });
  }
};

/**
 * GET /support/admin/conversations
 * Get all conversations (Admin only)
 */
exports.getAllConversations = async (req, res) => {
  try {
    const { status, assigned_to, page = 1, limit = 20 } = req.query;

    const filters = {
      status,
      assigned_to,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await supportService.getAllConversations(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in getAllConversations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
};

/**
 * GET /support/admin/agents
 * Get all support agents with their status (Admin only)
 */
exports.getAllAgents = async (req, res) => {
  try {
    const agents = await supportService.getAllAgents();
    res.json({ success: true, agents });
  } catch (error) {
    console.error('Error in getAllAgents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agents' });
  }
};

/**
 * PATCH /support/admin/agents/:agentId/max-chats
 * Update agent's maximum concurrent chats (Admin only)
 */
exports.updateAgentMaxChats = async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const { max_concurrent_chats } = req.body;

    if (!max_concurrent_chats || max_concurrent_chats < 1) {
      return res.status(400).json({
        success: false,
        message: 'max_concurrent_chats must be at least 1',
      });
    }

    await supportService.updateAgentMaxChats(agentId, max_concurrent_chats);
    res.json({ success: true, message: 'Agent max chats updated successfully' });
  } catch (error) {
    console.error('Error in updateAgentMaxChats:', error);

    if (error.message === 'Agent not found') {
      return res.status(404).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'Failed to update agent max chats' });
  }
};

/**
 * GET /support/admin/stats
 * Get support system statistics (Admin only)
 */
exports.getSupportStats = async (req, res) => {
  try {
    const stats = await supportService.getSupportStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error in getSupportStats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch support stats' });
  }
};
