const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, phone, email, address } = req.body;
    
    // 检查用户名是否已存在
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 检查手机号是否已存在
    const existingPhone = await User.findByPhone(phone);
    if (existingPhone) {
      return res.status(400).json({ error: '手机号已被注册' });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: '邮箱已被注册' });
    }

    // 创建用户，包含新增字段
    const userId = await User.create(username, password, phone, email, address);
    
    res.status(201).json({ message: '注册成功' });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }

    // 生成 token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 返回用户信息和 token，包括昵称信息
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname || user.username, // 确保使用正确的昵称
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

module.exports = router; 