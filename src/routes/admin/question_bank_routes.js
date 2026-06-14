const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/question_bank_controller');
const { authenticate, authorize } = require('../../middleware/auth_middleware');

router.use(authenticate);

// Question bank CRUD — accessible to trainer (2), admin (3), super-admin (4)
router.get('/questions', authorize(2, 3, 4), controller.listQuestions);
router.get('/questions/:id', authorize(2, 3, 4), controller.getQuestion);
router.post('/questions', authorize(2, 3, 4), controller.createQuestion);
router.put('/questions/:id', authorize(2, 3, 4), controller.updateQuestion);
router.delete('/questions/:id', authorize(2, 3, 4), controller.deleteQuestion);

module.exports = router;
