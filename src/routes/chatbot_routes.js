const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth_middleware');
const chatbotController = require('../controllers/chatbot_controller');

// All routes require authentication
router.use(authenticate);

// POST /chatbot/conversations — Create new conversation
router.post('/conversations', chatbotController.createConversation);

// GET /chatbot/conversations — List user's conversations
router.get('/conversations', chatbotController.getConversations);

// GET /chatbot/conversations/:uuid — Get conversation with messages
router.get('/conversations/:uuid', chatbotController.getConversation);

// POST /chatbot/conversations/:uuid/messages — Send message, get AI response
router.post('/conversations/:uuid/messages', chatbotController.sendMessage);

// POST /chatbot/conversations/:uuid/escalate — Create ticket from conversation
router.post('/conversations/:uuid/escalate', chatbotController.escalateToTicket);

// PATCH /chatbot/conversations/:uuid/close — Close conversation
router.patch('/conversations/:uuid/close', chatbotController.closeConversation);

module.exports = router;
