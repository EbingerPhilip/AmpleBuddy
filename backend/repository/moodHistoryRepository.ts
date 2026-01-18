const pool = require("../config/db");
import {EDailyMood} from "../modules/user";

export type MoodHistoryRow = {
    userid: number;
    mood: EDailyMood;
    date: string; // YYYY-MM-DD
};

class MoodHistoryRepository {
    async getMoodHistory(userid: number): Promise<MoodHistoryRow[]> {
        const sql = `
            SELECT userid, mood, date
            FROM moodhistory
            WHERE userid = ?
            ORDER BY date ASC
        `;
        const [rows]: any = await pool.execute(sql, [userid]);
        return rows as MoodHistoryRow[];
    }

    async upsertTodayMood(userId: number, mood: string): Promise<void> {
        const sql = `
            INSERT INTO moodhistory (userid, date, mood)
            VALUES (?, CURDATE(), ?) ON DUPLICATE KEY
            UPDATE
                mood =
            VALUES (mood)
        `;
        await pool.execute(sql, [userId, mood]);
    }
}

export const moodHistoryRepository = new MoodHistoryRepository();
