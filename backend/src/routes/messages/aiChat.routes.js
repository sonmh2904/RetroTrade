const express = require('express');
const router = express.Router();
const aiChatController = require('../../controller/messages/AI/aiChat.controller');
const aiTrainController = require('../../controller/messages/AI/aiTrain.controller');
const { authenticateToken } = require('../../middleware/auth');

router.post('/session', authenticateToken, aiChatController.createChatSession);
router.post('/message', authenticateToken, aiChatController.sendMessage);
router.get('/history/:sessionId', authenticateToken, aiChatController.getChatHistory);
router.get('/train', authenticateToken, aiTrainController.trainAI);

module.exports = router;