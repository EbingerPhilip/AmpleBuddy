const pool = require("../config/db");

class PreferencesRepository {
  async createPreferences(pref: {
    userid: number;
    age?: number | null;
    gender?: string | null;
    minGreen?: number | null;
  }): Promise<void> {
    const sql = `
      INSERT INTO prefrences (userid, age, gender, minGreen)
      VALUES (?, ?, ?, ?)
    `;
    await pool.execute(sql, [
      pref.userid,
      pref.age ?? null,
      pref.gender ?? null,
      pref.minGreen ?? null
    ]);
  }

  async getPreferencesByUserId(userid: number): Promise<any | null> {
    const sql = `SELECT * FROM prefrences WHERE userid = ?`;
    const [rows]: any = await pool.execute(sql, [userid]);
    return rows[0] ?? null;
  }

  async updatePreferences(userid: number, updates: {
    age?: number | null;
    gender?: string | null;
    minGreen?: number | null;
  }): Promise<void> {
    const sql = `
      UPDATE prefrences
      SET
        age = COALESCE(?, age),
        gender = COALESCE(?, gender),
        minGreen = COALESCE(?, minGreen)
      WHERE userid = ?
    `;
    await pool.execute(sql, [
      updates.age ?? null,
      updates.gender ?? null,
      updates.minGreen ?? null,
      userid
    ]);
  }

  /*
  probably needed later - once delete account becomes available
  
  async deletePreferences(userid: number): Promise<void> {
    const sql = `DELETE FROM prefrences WHERE userid = ?`;
    await pool.execute(sql, [userid]);
  }
    */
}

export const preferencesRepository = new PreferencesRepository();