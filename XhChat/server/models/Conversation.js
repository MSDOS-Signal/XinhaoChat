const db = require('../config/database');

class Conversation {
  static async create(name, type = 'private') {
    const [result] = await db.execute(
      'INSERT INTO conversations (name, type) VALUES (?, ?)',
      [name, type]
    );
    return result.insertId;
  }

  static async addParticipant(conversationId, userId) {
    try {
      await db.execute(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
        [conversationId, userId]
      );
    } catch (error) {
      console.error('添加参与者错误:', error);
      throw error;
    }
  }

  static async getUserConversations(userId) {
    try {
      // 先获取用户名
      const [userRow] = await db.execute(
        'SELECT username FROM users WHERE id = ?',
        [userId]
      );
      
      if (!userRow[0]) {
        throw new Error('用户不存在');
      }
      
      const username = userRow[0].username;

      const [rows] = await db.execute(
        `SELECT 
          c.*,
          GROUP_CONCAT(DISTINCT u.username) as participants,
          GROUP_CONCAT(DISTINCT u.id) as participant_ids,
          m.content as last_message,
          m.type as last_message_type,
          m.created_at as last_message_time
         FROM conversations c
         JOIN conversation_participants cp ON c.id = cp.conversation_id
         JOIN users u ON cp.user_id = u.id
         LEFT JOIN messages m ON m.id = (
           SELECT id 
           FROM messages 
           WHERE conversation_id = c.id 
           AND is_deleted = 0
           ORDER BY created_at DESC 
           LIMIT 1
         )
         WHERE c.id IN (
           SELECT conversation_id 
           FROM conversation_participants 
           WHERE user_id = ?
         )
         GROUP BY c.id
         ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
        [userId]
      );

      return rows.map(row => ({
        ...row,
        displayName: row.type === 'private'
          ? row.participants?.split(',').find(name => name !== username) || '未知用户'
          : row.name
      }));
    } catch (error) {
      console.error('获取会话列表错误:', error);
      throw error;
    }
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT c.*, 
        GROUP_CONCAT(DISTINCT u.username) as participants,
        GROUP_CONCAT(DISTINCT u.id) as participant_ids
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       JOIN users u ON cp.user_id = u.id
       WHERE c.id = ?
       GROUP BY c.id`,
      [id]
    );
    return rows[0];
  }

  static async getLastMessage(conversationId) {
    try {
      const [rows] = await db.execute(
        `SELECT m.*, u.username as sender_name 
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = ? AND m.is_deleted = 0
         ORDER BY m.created_at DESC
         LIMIT 1`,
        [conversationId]
      );
      return rows[0];
    } catch (error) {
      console.error('获取最后消息错误:', error);
      throw error;
    }
  }

  static async removeParticipant(conversationId, userId) {
    await db.execute(
      'DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );
  }

  static async isParticipant(conversationId, userId) {
    try {
      const [rows] = await db.execute(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
        [conversationId, userId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('检查参与者失败:', error);
      throw error;
    }
  }

  static async getParticipants(conversationId) {
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.avatar, u.is_online, u.last_seen
       FROM users u
       JOIN conversation_participants cp ON u.id = cp.user_id
       WHERE cp.conversation_id = ?`,
      [conversationId]
    );
    return rows;
  }

  static async setRole(conversationId, userId, role) {
    await db.execute(
      'INSERT INTO conversation_member_roles (conversation_id, user_id, role) VALUES (?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE role = ?',
      [conversationId, userId, role, role]
    );
  }

  static async getRole(conversationId, userId) {
    const [rows] = await db.execute(
      'SELECT role FROM conversation_member_roles WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );
    return rows[0]?.role || 'member';
  }

  static async getAdmins(conversationId) {
    const [rows] = await db.execute(
      `SELECT u.* FROM users u
       JOIN conversation_member_roles cmr ON u.id = cmr.user_id
       WHERE cmr.conversation_id = ? AND cmr.role IN ('owner', 'admin')`,
      [conversationId]
    );
    return rows;
  }

  static async searchConversations(userId, query) {
    const [rows] = await db.execute(
      `SELECT DISTINCT c.* 
       FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       WHERE cp.user_id = ? AND c.name LIKE ?`,
      [userId, `%${query}%`]
    );
    return rows;
  }
}

module.exports = Conversation; 