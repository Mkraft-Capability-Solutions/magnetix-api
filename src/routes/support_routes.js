const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth_middleware');
const supportController = require('../controllers/support_controller');

// ==========================================
// Public Routes (No Authentication Required)
// ==========================================

/**
 * GET /support/faqs
 * Get list of frequently asked questions
 */
router.get('/faqs', supportController.getFAQs);

/**
 * GET /support/contact-info
 * Get contact information (phone, email, hours)
 */
router.get('/contact-info', supportController.getContactInfo);

// ==========================================
// Authenticated User Routes
// ==========================================

/**
 * GET /support/agent-status
 * Get available support agents count
 */
router.get('/agent-status', authenticate, supportController.getAgentStatus);

// ==========================================
// Ticket Routes (Authenticated Users)
// ==========================================

/**
 * POST /support/tickets
 * Create a new support ticket
 * Body: { subject, description, category, priority }
 */
router.post('/tickets', authenticate, supportController.createTicket);

/**
 * GET /support/tickets
 * Get user's support tickets
 * Query params: status (optional)
 */
router.get('/tickets', authenticate, supportController.getUserTickets);

/**
 * GET /support/tickets/:id
 * Get ticket details with all replies
 */
router.get('/tickets/:id', authenticate, supportController.getTicketDetails);

/**
 * POST /support/tickets/:id/reply
 * Reply to a support ticket
 * Body: { message }
 */
router.post('/tickets/:id/reply', authenticate, supportController.addTicketReply);

/**
 * PATCH /support/tickets/:id/close
 * Close a support ticket (user can close their own ticket)
 */
router.patch('/tickets/:id/close', authenticate, supportController.closeTicket);

// ==========================================
// Conversation Routes (Authenticated Users)
// ==========================================

/**
 * GET /support/conversations
 * Get user's chat conversations
 * Query params: status (optional - waiting, active, closed)
 */
router.get('/conversations', authenticate, supportController.getUserConversations);

/**
 * GET /support/conversations/:id/messages
 * Get messages for a specific conversation
 * Query params: limit, offset
 */
router.get('/conversations/:id/messages', authenticate, supportController.getConversationMessages);

// ==========================================
// Admin Routes (Admins and Super Admins Only)
// ==========================================

/**
 * GET /support/admin/tickets
 * Get all support tickets with filters
 * Query params: status, priority, assigned_to, category, page, limit
 */
router.get(
  '/admin/tickets',
  authenticate,
  authorize(3, 4),
  supportController.getAllTickets
);

/**
 * PATCH /support/admin/tickets/:id/assign
 * Assign ticket to a support agent
 * Body: { assigned_to }
 */
router.patch(
  '/admin/tickets/:id/assign',
  authenticate,
  authorize(3, 4),
  supportController.assignTicket
);

/**
 * PATCH /support/admin/tickets/:id/status
 * Update ticket status
 * Body: { status, resolution_notes (optional) }
 */
router.patch(
  '/admin/tickets/:id/status',
  authenticate,
  authorize(3, 4),
  supportController.updateTicketStatus
);

/**
 * POST /support/admin/tickets/:id/internal-note
 * Add internal note to ticket (only visible to admins)
 * Body: { message }
 */
router.post(
  '/admin/tickets/:id/internal-note',
  authenticate,
  authorize(3, 4),
  supportController.addInternalNote
);

/**
 * GET /support/admin/conversations
 * Get all conversations (for admin dashboard)
 * Query params: status, assigned_to, page, limit
 */
router.get(
  '/admin/conversations',
  authenticate,
  authorize(3, 4),
  supportController.getAllConversations
);

/**
 * GET /support/admin/agents
 * Get all support agents with their status
 */
router.get(
  '/admin/agents',
  authenticate,
  authorize(3, 4),
  supportController.getAllAgents
);

/**
 * PATCH /support/admin/agents/:agentId/max-chats
 * Update agent's maximum concurrent chats
 * Body: { max_concurrent_chats }
 */
router.patch(
  '/admin/agents/:agentId/max-chats',
  authenticate,
  authorize(3, 4),
  supportController.updateAgentMaxChats
);

/**
 * GET /support/admin/stats
 * Get support system statistics (total tickets, open/closed, avg response time, etc.)
 */
router.get(
  '/admin/stats',
  authenticate,
  authorize(3, 4),
  supportController.getSupportStats
);

module.exports = router;
