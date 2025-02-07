const express = require('express');
const router = express.Router();
const UserSettings = require('../models/UserSettings');
const { auth } = require('../middlewares/auth');

// 获取用户设置
router.get('/', auth, async (req, res) => {
  try {
    const settings = await UserSettings.getSettings(req.user.id);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 更新用户设置
router.put('/', auth, async (req, res) => {
  try {
    const settings = await UserSettings.updateSettings(req.user.id, req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: '更新设置失败' });
  }
});

module.exports = router; 