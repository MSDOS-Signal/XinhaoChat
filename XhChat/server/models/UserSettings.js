const db = require('../config/database');

class UserSettings {
  static async getSettings(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );
    return rows[0] || await this.createDefaultSettings(userId);
  }

  static async createDefaultSettings(userId) {
    await db.execute(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    );
    return this.getSettings(userId);
  }

  static async updateSettings(userId, settings) {
    const fields = Object.keys(settings);
    const values = Object.values(settings);
    
    const query = `UPDATE user_settings SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE user_id = ?`;
    await db.execute(query, [...values, userId]);
    
    return this.getSettings(userId);
  }
}

module.exports = UserSettings; 