const db = require('../config/database');

class Message {
  static async create(conversationId, senderId, content, type = 'text') {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 创建消息
      const [result] = await connection.execute(
        'INSERT INTO messages (conversation_id, sender_id, content, type) VALUES (?, ?, ?, ?)',
        [conversationId, senderId, content, type]
      );

      // 更新会话的最后更新时间
      await connection.execute(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [conversationId]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getByConversationId(conversationId) {
    const [rows] = await db.execute(
      `SELECT m.*, u.nickname, u.username, u.avatar 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE m.conversation_id = ? 
       ORDER BY m.created_at ASC`,
      [conversationId]
    );
    return rows;
  }

  static async findById(messageId) {
    const [rows] = await db.execute(
      'SELECT * FROM messages WHERE id = ? AND is_deleted = 0',
      [messageId]
    );
    return rows[0];
  }

  static async markAsRead(messageId, userId) {
    await db.execute(
      'INSERT INTO message_reads (message_id, user_id) VALUES (?, ?) ' +
      'ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP',
      [messageId, userId]
    );
  }

  static async getUnreadCount(conversationId, userId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count 
       FROM messages m
       LEFT JOIN message_reads mr ON m.id = mr.message_id AND mr.user_id = ?
       WHERE m.conversation_id = ? 
       AND m.sender_id != ? 
       AND m.is_deleted = 0 
       AND mr.id IS NULL`,
      [userId, conversationId, userId]
    );
    return rows[0].count;
  }

  static async deleteMessage(messageId) {
    await db.execute(
      'UPDATE messages SET is_deleted = 1 WHERE id = ?',
      [messageId]
    );
  }

  static async updateMessageStatus(messageId, userId, status) {
    await db.execute(
      'INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE status = ?',
      [messageId, userId, status, status]
    );
  }

  static async getMessageStatus(messageId) {
    const [rows] = await db.execute(
      `SELECT u.username, ms.status, ms.updated_at
       FROM message_status ms
       JOIN users u ON ms.user_id = u.id
       WHERE ms.message_id = ?`,
      [messageId]
    );
    return rows;
  }

  static async searchMessages(userId, query) {
    const [rows] = await db.execute(
      `SELECT m.*, c.name as conversation_name
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       WHERE cp.user_id = ? AND m.content LIKE ?
       ORDER BY m.created_at DESC`,
      [userId, `%${query}%`]
    );
    return rows;
  }

  static async getConversations(userId) {
    const [rows] = await db.execute(
      `SELECT DISTINCT 
        c.id,
        c.name,
        c.type,
        c.created_at,
        c.updated_at,
        COALESCE(m.content, '') as last_message,
        COALESCE(m.type, 'text') as last_message_type,
        COALESCE(m.created_at, c.created_at) as last_message_time
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN messages m ON m.id = (
        SELECT id FROM messages 
        WHERE conversation_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
      WHERE cp.user_id = ?
      ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
      [userId]
    );
    return rows;
  }
}

module.exports = Message; 