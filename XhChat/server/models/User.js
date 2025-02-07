const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(username, password, phone, email, address) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, password, nickname, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, username, phone, email, address]
    );
    return result.insertId;
  }

  static async findByUsername(username) {
    const [rows] = await db.execute(
      'SELECT id, username, nickname, password, avatar, gender, age, is_online, last_seen FROM users WHERE username = ?',
      [username]
    );
    if (rows[0]) {
      rows[0].nickname = rows[0].nickname || rows[0].username;
    }
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, username, nickname, avatar, gender, age, is_online, last_seen FROM users WHERE id = ?',
      [id]
    );
    if (rows[0]) {
      rows[0].nickname = rows[0].nickname || rows[0].username;
    }
    return rows[0];
  }

  static async searchUsers(query, currentUserId) {
    const [rows] = await db.execute(
      `SELECT id, username, avatar 
       FROM users 
       WHERE username LIKE ? AND id != ? 
       AND id NOT IN (
         SELECT friend_id 
         FROM friendships 
         WHERE user_id = ?
       )`,
      [`%${query}%`, currentUserId, currentUserId]
    );
    return rows;
  }

  static async addFriend(userId, friendId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 检查是否已经是好友
      const [existing] = await connection.execute(
        'SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?',
        [userId, friendId]
      );

      if (existing.length > 0) {
        // 如果已经是好友，查找他们的私聊会话
        const [conversations] = await connection.execute(
          `SELECT c.id 
           FROM conversations c
           JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
           JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
           WHERE c.type = 'private'
           AND cp1.user_id = ?
           AND cp2.user_id = ?`,
          [userId, friendId]
        );

        if (conversations.length > 0) {
          await connection.commit();
          return conversations[0].id;
        }
      }

      // 添加好友关系（如果还不是好友）
      if (!existing.length) {
        await connection.execute(
          'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
          [userId, friendId]
        );
        await connection.execute(
          'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
          [friendId, userId]
        );
      }

      // 创建私聊会话
      const [result] = await connection.execute(
        'INSERT INTO conversations (name, type) VALUES (?, ?)',
        ['私聊', 'private']
      );
      const conversationId = result.insertId;

      // 添加会话参与者
      await connection.execute(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
        [conversationId, userId]
      );
      await connection.execute(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
        [conversationId, friendId]
      );

      await connection.commit();
      return conversationId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getFriends(userId) {
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.is_online, u.last_seen
       FROM users u
       JOIN friendships f ON u.id = f.friend_id
       WHERE f.user_id = ?`,
      [userId]
    );
    // 为每个好友添加显示名称
    return rows.map(friend => ({
      ...friend,
      displayName: friend.nickname || friend.username
    }));
  }

  static async updateProfile(userId, updates) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      console.log('开始更新用户资料:', { userId, updates });

      if (Object.keys(updates).length > 0) {
        const updateFields = [];
        const values = [];
        
        Object.entries(updates).forEach(([key, value]) => {
          updateFields.push(`${key} = ?`);
          values.push(value);
        });

        values.push(userId);
        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        console.log('执行更新查询:', { query, values });
        
        await connection.execute(query, values);
      }

      await connection.commit();
      console.log('用户资料更新成功');
    } catch (error) {
      console.error('更新用户资料失败:', error);
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findByPhone(phone) {
    const [rows] = await db.execute(
      'SELECT id, username, nickname FROM users WHERE phone = ?',
      [phone]
    );
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await db.execute(
      'SELECT id, username, nickname FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }
}

module.exports = User; 