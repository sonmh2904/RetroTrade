const express = require('express');
const router = express.Router();
const aiChatController = require('../../controller/messages/aiChat.controller');
const { authenticateToken } = require('../../middleware/auth');

router.post('/session', authenticateToken, aiChatController.createChatSession);
router.post('/message', authenticateToken, aiChatController.sendMessage);
router.get('/history/:sessionId', authenticateToken, aiChatController.getChatHistory);

module.exports = router;