const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { auth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const Conversation = require('../models/Conversation');
const db = require('../config/database');

// 获取会话消息
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log('获取会话消息:', { conversationId, userId: req.user.id });

    // 验证用户是否是会话成员
    const isParticipant = await Conversation.isParticipant(conversationId, req.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: '无权访问此会话' });
    }

    const messages = await Message.getByConversationId(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ error: '获取消息失败', details: error.message });
  }
});

// 上传文件
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件被上传' });
    }

    const fileUrl = `/uploads/files/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 上传语音消息
router.post('/upload-audio', auth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有音频被上传' });
    }

    const audioUrl = `/uploads/audio/${req.file.filename}`;
    res.json({ url: audioUrl });
  } catch (error) {
    console.error('音频上传失败:', error);
    res.status(500).json({ error: '音频上传失败' });
  }
});

// 获取会话列表
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Message.getConversations(req.user.id);
    console.log('获取到的会话列表:', conversations.length);
    res.json(conversations);
  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({ error: '获取会话列表失败' });
  }
});

// 撤回消息
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    // 检查是否是消息发送者
    if (message.sender_id !== req.user.id) {
      return res.status(403).json({ error: '只能撤回自己的消息' });
    }

    // 检查消息时间（比如2分钟内可撤回）
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    if (now - messageTime > 2 * 60 * 1000) {
      return res.status(400).json({ error: '消息发送超过2分钟，无法撤回' });
    }

    await Message.deleteMessage(req.params.messageId);
    res.json({ message: '消息已撤回' });
  } catch (error) {
    res.status(500).json({ error: '撤回消息失败' });
  }
});

// 标记消息已读
router.post('/:messageId/read', auth, async (req, res) => {
  try {
    await Message.markAsRead(req.params.messageId, req.user.id);
    res.json({ message: '消息已读' });
  } catch (error) {
    console.error('标记消息已读失败:', error);
    res.status(500).json({ error: '标记消息已读失败' });
  }
});

// 获取未读消息数
router.get('/unread/:conversationId', auth, async (req, res) => {
  try {
    const count = await Message.getUnreadCount(req.params.conversationId, req.user.id);
    res.json({ count });
  } catch (error) {
    console.error('获取未读消息数失败:', error);
    res.status(500).json({ error: '获取未读消息数失败' });
  }
});

// 获取消息状态
router.get('/:messageId/status', auth, async (req, res) => {
  try {
    const status = await Message.getMessageStatus(req.params.messageId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: '获取消息状态失败' });
  }
});

// 搜索消息
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const messages = await Message.searchMessages(req.user.id, query);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: '搜索消息失败' });
  }
});

module.exports = router; 