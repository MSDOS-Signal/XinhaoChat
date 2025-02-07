const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./config/database');
const authRoutes = require('./routes/auth');
const { auth } = require('./middlewares/auth');
const Message = require('./models/Message');
const messagesRoutes = require('./routes/messages');
const usersRoutes = require('./routes/users');
const path = require('path');
const conversationsRoutes = require('./routes/conversations');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const UserStatus = require('./models/UserStatus');
const settingsRoutes = require('./routes/settings');
const Conversation = require('./models/Conversation');
const { JWT_SECRET } = require('./config/jwt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
const avatarDir = path.join(uploadDir, 'avatars');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir);
}

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 基础路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/settings', settingsRoutes);

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log('新的socket连接');

  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // 获取用户信息
      const [userRow] = await db.execute(
        'SELECT id, username FROM users WHERE id = ?',
        [decoded.id]
      );
      
      if (!userRow[0]) {
        throw new Error('用户不存在');
      }

      socket.user = {
        id: userRow[0].id,
        username: userRow[0].username
      };

      // 加入用户私人房间
      socket.join(`user_${socket.user.id}`);

      console.log('Socket认证成功:', socket.user);
      socket.emit('authenticated', { success: true });
      
      await UserStatus.setOnline(socket.user.id);
      socket.broadcast.emit('user_status', { userId: socket.user.id, status: 'online' });
    } catch (error) {
      console.error('Socket认证错误:', error);
      socket.emit('authenticated', { success: false, error: error.message });
      socket.disconnect();
    }
  });

  // 发送消息
  socket.on('send_message', async (data) => {
    try {
      if (!socket.user) {
        throw new Error('未认证的用户');
      }

      const { conversationId, content, type = 'text' } = data;

      // 检查用户是否在会话中
      const isParticipant = await Conversation.isParticipant(conversationId, socket.user.id);
      if (!isParticipant) {
        throw new Error('不是会话成员');
      }

      // 创建消息
      const messageId = await Message.create(conversationId, socket.user.id, content, type);
      
      // 获取完整的消息信息
      const [messageDetails] = await db.execute(
        `SELECT m.*, u.nickname, u.username, u.avatar 
         FROM messages m 
         JOIN users u ON m.sender_id = u.id 
         WHERE m.id = ?`,
        [messageId]
      );

      const message = {
        ...messageDetails,
        created_at: new Date(),
        displayName: messageDetails.nickname || messageDetails.username // 优先使用昵称
      };

      // 获取会话所有参与者
      const [participants] = await db.execute(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = ?',
        [conversationId]
      );

      // 广播消息给所有参与者
      participants.forEach(({ user_id }) => {
        // 使用房间广播
        io.to(`user_${user_id}`).emit('receive_message', {
          ...message,
          conversation_id: conversationId // 确保包含会话ID
        });
      });

      // 更新会话时间
      await db.execute(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [conversationId]
      );

      // 通知所有参与者更新会话列表
      participants.forEach(({ user_id }) => {
        io.to(`user_${user_id}`).emit('conversation_updated', { 
          conversationId,
          lastMessage: {
            content,
            type,
            sender: socket.user.username,
            created_at: new Date()
          }
        });
      });

    } catch (error) {
      console.error('发送消息错误:', error);
      socket.emit('message_error', { error: error.message });
    }
  });

  // 加入房间
  socket.on('join_room', (conversationId) => {
    if (conversationId) {
      socket.join(conversationId.toString());
      console.log(`用户 ${socket.user.id} 加入房间 ${conversationId}`);
    }
  });

  // 离开房间
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`用户 ${socket.user.id} 离开房间 ${roomId}`);
  });

  // 处理群聊创建事件
  socket.on('group_created', async (data) => {
    try {
      const { conversationId, participants, conversation } = data;
      
      // 通知所有参与者（除了创建者）
      participants.forEach(participantId => {
        if (participantId !== socket.user.id) {
          io.to(`user_${participantId}`).emit('new_conversation', {
            conversationId,
            conversation
          });
        }
      });
    } catch (error) {
      console.error('处理群聊创建通知失败:', error);
    }
  });
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器错误',
    details: err.message
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});