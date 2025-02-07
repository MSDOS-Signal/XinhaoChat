const db = require('../config/database');

class UserStatus {
  static async setOnline(userId) {
    await db.execute(
      'UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  static async setOffline(userId) {
    await db.execute(
      'UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  static async getStatus(userId) {
    const [rows] = await db.execute(
      'SELECT is_online, last_seen FROM users WHERE id = ?',
      [userId]
    );
    return rows[0];
  }
}

module.exports = UserStatus; 