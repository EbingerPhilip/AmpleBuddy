const pool = require("../config/db");

/**
 * Runs one-time maintenance tasks on server startup:
 * - Reset dailyMood to 'gray' for users who haven't logged mood today (calendar day)
 * - Clear buddypool (since server isn't always running and triggers might not fire)
 */
async function runStartupMaintenance(): Promise<void> {
    // 1) Reset dailyMood for users WITHOUT a moodhistory row today
    // moodhistory.date is DATE, so CURDATE() is the correct comparison.
    const [moodResult]: any = await pool.execute(
        `
        UPDATE users u
        LEFT JOIN moodhistory mh
            ON mh.userid = u.userid
           AND mh.date = CURDATE()
        SET u.dailyMood = 'gray'
        WHERE mh.userid IS NULL
          AND u.dailyMood <> 'gray'
        `
    );

    // 2) Clear buddy pool
    const [poolResult]: any = await pool.execute(`DELETE FROM buddypool`);

    console.log(
        `[BOOT] Startup maintenance complete: moods reset=${moodResult?.affectedRows ?? 0}, buddypool cleared=${poolResult?.affectedRows ?? 0}`
    );
}

export const startupService = {
    runStartupMaintenance,
};
