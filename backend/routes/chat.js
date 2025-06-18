const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { Op } = require('sequelize');

// Get chat history between a mechanic and a customer
router.get('/history/:userId/:mechanicId', async (req, res) => {
    try {
        const { userId, mechanicId } = req.params;

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { sender_id: userId, receiver_id: mechanicId },
                    { sender_id: mechanicId, receiver_id: userId }
                ]
            },
            order: [['created_at', 'ASC']]
        });

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Send a message
router.post('/send', async (req, res) => {
    try {
        const { sender_id, receiver_id, content } = req.body;

        if (!sender_id || !receiver_id || !content) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const message = await Message.create({ sender_id, receiver_id, content });

        // Emit message to receiver in real-time
        req.io.emit('chatMessage', { sender_id, receiver_id, content, created_at: message.created_at });

        res.json({ success: true, message });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
