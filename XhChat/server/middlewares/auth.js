const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('认证失败:', error);
    res.status(401).json({ error: '认证失败' });
  }
};

module.exports = { auth }; 