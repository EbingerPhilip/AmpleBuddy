import { EDailyMood } from "../modules/user"; 

const pool = require("../config/db");

class BuddyPoolRepository {
  async findByMood(mood: EDailyMood): Promise<{ userid: number; mood: EDailyMood } | null> {
    const [rows]: any = await pool.execute(
      `SELECT userid, mood FROM buddypool WHERE mood = ? LIMIT 1`,
      [mood]
    );
    return rows[0] || null;
  }

  // find user with least chatCount for given mood - used for load balancing (ie assign new red user to green user with least chats)
    async findByMoodLeastLoaded(mood: EDailyMood): Promise<{ userid: number; mood: EDailyMood; chatCount: number } | null> {
    const [rows]: any = await pool.execute(
      `SELECT userid, mood, chatCount FROM buddypool WHERE mood = ? ORDER BY chatCount ASC LIMIT 1`,
      [mood]
    );
    return rows[0] || null;
  }
  
  async findByMoodNeedingBuddy(mood: EDailyMood, maxChatCount: number): Promise<{ userid: number; mood: EDailyMood; chatCount: number } | null> {
    const [rows]: any = await pool.execute(
      `SELECT userid, mood, chatCount FROM buddypool WHERE mood = ? AND chatCount < ? ORDER BY chatCount ASC LIMIT 1`,
      [mood, maxChatCount]
    );
    return rows[0] || null;
  }

  // increments chatCount for user in buddypool table - used to indicate both red users waiting for buddy, and load balanching
  async incrementChatCount(userId: number): Promise<void> {
    await pool.execute(`UPDATE buddypool SET chatCount = chatCount + 1 WHERE userid = ?`, [userId]);
  }

  // probably redundant - current logic does not use decrese in chatcount
  async decrementChatCount(userId: number): Promise<void> {
    await pool.execute(`UPDATE buddypool SET chatCount = GREATEST(0, chatCount - 1) WHERE userid = ?`, [userId]);
  }

  async addUser(userId: number, mood: EDailyMood): Promise<void> {
    const sql = `
      INSERT INTO buddypool (userid, mood)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE mood = VALUES(mood)
    `;
    await pool.execute(sql, [userId, mood]);
  }

  async removeUser(userId: number): Promise<void> {
    await pool.execute(`DELETE FROM buddypool WHERE userid = ?`, [userId]);
  }
}

export const buddyPoolRepository = new BuddyPoolRepository();