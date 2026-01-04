const pool = require("../config/db");

class UserRepository {
  async createUser(user: {
    username: string;
    password: string;
    nicknames: string;
    dailyMood?: string;
    dateOfBirth?: Date | null;
    theme?: string;
    pronouns?: string;
    instantBuddy?: boolean;
  }): Promise<number> {
    const sql = `
      INSERT INTO users (username, password, nicknames, dailyMood, dateOfBirth, theme, pronouns, instantBuddy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result]: any = await pool.execute(sql, [
      user.username,
      user.password,
      user.nicknames,
      user.dailyMood ?? 'gray',
      user.dateOfBirth ?? null,
      user.theme ?? 'light',
      user.pronouns ?? 'hidden',
      user.instantBuddy ? 1 : 0
    ]);
    return result.insertId;
  }

  async getUserById(userid: number): Promise<any | null> {
    const sql = `SELECT * FROM users WHERE userid = ?`;
    const [rows]: any = await pool.execute(sql, [userid]);
    return rows[0] ?? null;
  }


  async updateUser(userid: number, updates: {
    username?: string;
    password?: string;
    nicknames?: string;
    dailyMood?: string;
    dateOfBirth?: Date | null;
    theme?: string;
    pronouns?: string;
    instantBuddy?: boolean;
  }): Promise<void> {
    const sql = `
      UPDATE users
      SET
        username = COALESCE(?, username),
        password = COALESCE(?, password),
        nicknames = COALESCE(?, nicknames),
        dailyMood = COALESCE(?, dailyMood),
        dateOfBirth = COALESCE(?, dateOfBirth),
        theme = COALESCE(?, theme),
        pronouns = COALESCE(?, pronouns),
        instantBuddy = COALESCE(?, instantBuddy)
      WHERE userid = ?
    `;
    await pool.execute(sql, [
      updates.username ?? null,
      updates.password ?? null,
      updates.nicknames ?? null,
      updates.dailyMood ?? null,
      updates.dateOfBirth ?? null,
      updates.theme ?? null,
      updates.pronouns ?? null,
      updates.instantBuddy === undefined ? null : (updates.instantBuddy ? 1 : 0),
      userid
    ]);
  }

 
  async deleteUser(userid: number): Promise<void> {
    const sql = `DELETE FROM users WHERE userid = ?`;
    await pool.execute(sql, [userid]);
  }
  

}

export const userRepository = new UserRepository();