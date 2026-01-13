import { EDailyMood } from "../modules/user"; 

const pool = require("../config/db");

class BuddyPoolRepository {

  readonly maxChatCount = 5; // Define maxChatCount for filtering - how many times can a green user be matched?

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


   // emergency buddy match - currently used to find red users with chatCount < 1 for immediate matching with green users
  async emergencyBuddyMatch(mood: EDailyMood, requiredChatCount: number): Promise<{ userid: number; mood: EDailyMood; chatCount: number } | null> {
    const [rows]: any = await pool.execute(
      `SELECT userid, mood, chatCount FROM buddypool WHERE mood = ? AND chatCount < ? ORDER BY chatCount ASC LIMIT 1`,
      [mood, requiredChatCount]
    );
    return rows[0] || null;
  }


  // redundant - kept for reference (it is not possible to implement advanced filtering in single SQL query easily)
  async advancedFindGreenBuddy(
    pronounsPreference: string | null,
    minGreenstreak: number | null,
    dateOfBirth: Date | null
  ): Promise<{ userid: number; mood: EDailyMood; chatCount: number } | null> {
    let sql = `SELECT userid, mood, chatCount FROM buddypool WHERE mood = ?`;
    const params: any[] = [EDailyMood.green];

    let orderClauses = [];

    // Priority 1: Pronouns match (if preference given)
    if (pronounsPreference) {
      orderClauses.push(`CASE WHEN pronouns = ? THEN 0 ELSE 1 END`);
      params.push(pronounsPreference);
    }

    // Priority 2: Greenstreak (higher is better)
    // If minGreenstreak given, also add as filter
    if (minGreenstreak !== null && minGreenstreak !== undefined) {
      sql += ` AND greenstreak >= ?`;
      params.push(minGreenstreak);
    }
    orderClauses.push(`COALESCE(greenstreak, 0) DESC`);

    // Priority 3: Age closest match (by dateOfBirth - considers years, months, and days)
    if (dateOfBirth !== null && dateOfBirth !== undefined) {
      orderClauses.push(`ABS(DATEDIFF(dateOfBirth, ?)) ASC`);
      params.push(dateOfBirth);
    }

    // Priority 4: Load balancing (least loaded first)
    orderClauses.push(`chatCount ASC`);

    sql += ` ORDER BY ` + orderClauses.join(', ') + ` LIMIT 1`;

    const [rows]: any = await pool.execute(sql, params);
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

  // Updated addUser() to also store pronouns, greenstreak, und dateOfBirth in buddypool table
  // Null-values are accepted and handled in service layer during filtering logic
  async addUser(userId: number, mood: EDailyMood): Promise<void> {
    // pronouns, greenstreak and dateOfBirth are loaded from users table, based on userId
    const [userRows]: any = await pool.execute(
      `SELECT pronouns, greenstreak, dateOfBirth
       FROM users WHERE userid = ?`,
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const { pronouns, greenstreak, dateOfBirth } = userRows[0];

    const sql = `
      INSERT INTO buddypool (userid, mood, chatCount, pronouns, greenstreak, dateOfBirth)
      VALUES (?, ?, 0, ?, ?, ?)
      ON DUPLICATE KEY UPDATE mood = VALUES(mood), chatCount = 0, pronouns = ?, greenstreak = ?, dateOfBirth = ?
    `;
    await pool.execute(sql, [userId, mood, pronouns, greenstreak, dateOfBirth, pronouns, greenstreak, dateOfBirth]);
  }

  async removeUser(userId: number): Promise<void> {
    await pool.execute(`DELETE FROM buddypool WHERE userid = ?`, [userId]);
  }

  /*
  New method to find best green buddy for red user based on multiple criteria
  Idea is to load all green buddies and filter/sort in backend due to complexity
  
  Current approach loads all green buddies with chatCount below maxChatCount and applies the following logic:
  
  1) Smart Filtering:
  1a) Pronouns match (if specified) - if no matches, consider all
  1b) Greenstreak minimum (if specified) - if no matches, consider all

  2) Ranking by:
  2a) Age closest match (by dateOfBirth)
  2b) Greenstreak (higher is better)
  2c) Load balancing (least loaded first)

  Return the best match (userId) or null if none found.
  */
  async findBestGreenBuddy(
    pronouns: string | null,
    greenstreak: number | null,
    dateOfBirth: Date | null
  ): Promise<{ userid: number; mood: EDailyMood; chatCount: number } | null> {
    console.log ("Finding best green buddy with criteria:", { pronouns, greenstreak, dateOfBirth });
    
    // Load all green buddies with chatCount below maxChatCount
    const [rows]: any = await pool.execute(
      `SELECT userid, mood, chatCount, pronouns, greenstreak, dateOfBirth FROM buddypool WHERE mood = ? AND chatCount < ?` ,
      [EDailyMood.green, this.maxChatCount]
    );

    // If no green buddies, return null -> the red user is added to pool by userService with chatcount 0, waiting for next green user
    if (!rows || rows.length === 0) return null;

    let candidates = rows;

    // Smart Filter 1: if pronoun matches exist, use them; otherwise use all
    if (pronouns) {
      const pronounsMatches = rows.filter((b: any) => b.pronouns === pronouns);
      if (pronounsMatches.length > 0) {
        candidates = pronounsMatches;
      }
    }

    // Smart Filter 2: by greenstreak minimum if specified - but only if we have matches remaining
    if (greenstreak !== null && greenstreak !== undefined) {
      const filteredByGreenstreak = candidates.filter((b: any) => b.greenstreak >= greenstreak);
      // Only apply greenstreak filter if we still have candidates; otherwise keep original candidates
      if (filteredByGreenstreak.length > 0) {
        candidates = filteredByGreenstreak;
      }
    }

    // Rank candidates by priority
    const sorted = candidates.sort((a: any, b: any) => {
      // Priority 1: Age closest match (by dateOfBirth)
      if (dateOfBirth) {
        const aDiff = Math.abs(this.daysBetween(a.dateOfBirth, dateOfBirth));
        const bDiff = Math.abs(this.daysBetween(b.dateOfBirth, dateOfBirth));
        if (aDiff !== bDiff) return aDiff - bDiff;
      }

      // Priority 2: Greenstreak (higher is better)
      const aStreak = a.greenstreak ?? 0;
      const bStreak = b.greenstreak ?? 0;
      if (aStreak !== bStreak) return bStreak - aStreak;


      // Priority 3: Load balancing (least loaded first)
      return a.chatCount - b.chatCount;
    });
    // DEBUG: Log sorted candidates
    console.log("Sorted candidates for buddy matching:", sorted);
    console.log("Best match selected:", sorted[0]);
    

    return sorted[0] || null;
  }

  // Helper: Calculate days between two dates
  private daysBetween(date1: any, date2: any): number {
    if (!date1 || !date2) return 999999;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export const buddyPoolRepository = new BuddyPoolRepository();