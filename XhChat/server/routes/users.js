const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const path = require('path');
const fs = require('fs');

// 搜索用户
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    const users = await User.searchUsers(query.trim(), req.user.id);
    console.log('搜索结果:', users);
    res.json(users);
  } catch (error) {
    console.error('搜索用户错误:', error);
    res.status(500).json({ error: '搜索用户失败' });
  }
});

// 获取好友列表
router.get('/friends', auth, async (req, res) => {
  try {
    const friends = await User.getFriends(req.user.id);
    res.json(friends);
  } catch (error) {
    console.error('获取好友列表错误:', error);
    res.status(500).json({ error: '获取好友列表失败' });
  }
});

// 添加好友
router.post('/friends/add/:userId', auth, async (req, res) => {
  try {
    const friendId = parseInt(req.params.userId);
    
    // 检查是否添加自己
    if (req.user.id === friendId) {
      return res.status(400).json({ error: '不能添加自己为好友' });
    }

    // 检查用户是否存在
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 添加好友并创建会话
    const conversationId = await User.addFriend(req.user.id, friendId);
    
    res.json({ 
      message: '添加好友成功',
      conversationId
    });
  } catch (error) {
    console.error('添加好友错误:', error);
    // 检查是否是重复添加好友的错误
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: '已经是好友了' });
    }
    res.status(500).json({ error: '添加好友失败' });
  }
});

// 更新个人资料
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
  try {
    console.log('收到更新个人资料请求:', {
      body: req.body,
      file: req.file,
      userId: req.user.id
    });

    const updates = {};

    if (req.body.nickname) {
      updates.nickname = req.body.nickname;
    }
    if (req.body.gender) {
      updates.gender = req.body.gender;
    }
    if (req.body.age) {
      updates.age = parseInt(req.body.age);
    }

    // 处理头像上传
    if (req.file) {
      updates.avatar = `/uploads/avatars/${req.file.filename}`;
      console.log('新头像路径:', updates.avatar);
    }

    await User.updateProfile(req.user.id, updates);
    const updatedUser = await User.findById(req.user.id);
    res.json(updatedUser);
  } catch (error) {
    console.error('更新个人资料失败:', error);
    res.status(500).json({ 
      error: '更新个人资料失败',
      details: error.message 
    });
  }
});

module.exports = router; 