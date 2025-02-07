const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { auth } = require('../middlewares/auth');
const db = require('../config/database');

// 添加日志中间件
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// 创建群聊
router.post('/group', auth, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { name, members } = req.body;
    
    if (!name || !members || members.length === 0) {
      return res.status(400).json({ error: '群聊名称和成员不能为空' });
    }

    // 创建群聊
    const [result] = await connection.execute(
      'INSERT INTO conversations (name, type, owner_id) VALUES (?, ?, ?)',
      [name, 'group', req.user.id]
    );
    const conversationId = result.insertId;
    
    // 添加创建者为群主
    await connection.execute(
      'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
      [conversationId, req.user.id]
    );
    
    // 添加其他成员
    for (const memberId of members) {
      await connection.execute(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
        [conversationId, memberId]
      );
    }

    await connection.commit();

    // 获取创建的群聊信息
    const conversation = await Conversation.findById(conversationId);
    res.status(201).json(conversation);
  } catch (error) {
    await connection.rollback();
    console.error('创建群聊错误:', error);
    res.status(500).json({ error: '创建群聊失败', details: error.message });
  } finally {
    connection.release();
  }
});

// 获取群聊信息
router.get('/group/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: '群聊不存在' });
    }
    res.json(conversation);
  } catch (error) {
    console.error('获取群聊信息失败:', error);
    res.status(500).json({ error: '获取群聊信息失败' });
  }
});

// 获取群成员列表
router.get('/group/:id/members', auth, async (req, res) => {
  try {
    const participants = await Conversation.getParticipants(req.params.id);
    res.json(participants);
  } catch (error) {
    console.error('获取群成员列表失败:', error);
    res.status(500).json({ error: '获取群成员列表失败' });
  }
});

// 移除群成员
router.delete('/group/:id/members/:userId', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    // 检查是否是群主
    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.owner_id !== req.user.id) {
      return res.status(403).json({ error: '没有权限执行此操作' });
    }

    await Conversation.removeParticipant(id, userId);
    res.json({ message: '成员已移除' });
  } catch (error) {
    console.error('移除群成员失败:', error);
    res.status(500).json({ error: '移除群成员失败' });
  }
});

// 添加群成员
router.post('/group/:id/members', auth, async (req, res) => {
  try {
    const { members } = req.body;
    const conversationId = req.params.id;

    for (const memberId of members) {
      await Conversation.addParticipant(conversationId, memberId);
    }

    res.json({ message: '添加成员成功' });
  } catch (error) {
    res.status(500).json({ error: '添加群成员失败' });
  }
});

// 设置群成员角色
router.put('/group/:id/members/:userId/role', auth, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    const userRole = await Conversation.getRole(id, req.user.id);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: '没有权限设置角色' });
    }

    await Conversation.setRole(id, userId, role);
    res.json({ message: '角色设置成功' });
  } catch (error) {
    res.status(500).json({ error: '设置角色失败' });
  }
});

// 搜索会话
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const conversations = await Conversation.searchConversations(req.user.id, query);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: '搜索会话失败' });
  }
});

// 创建会话
router.post('/create', auth, async (req, res) => {
  try {
    const { name, type, participants } = req.body;
    
    // 创建会话
    const conversationId = await Conversation.create({
      name,
      type,
      creatorId: req.user.id,
      participants: [...participants, req.user.id]
    });

    res.status(201).json({ 
      message: '会话创建成功',
      conversationId 
    });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({ error: '创建会话失败' });
  }
});

// 测试路由
router.get('/test', (req, res) => {
  res.json({ message: 'Conversations route is working' });
});

module.exports = router; 