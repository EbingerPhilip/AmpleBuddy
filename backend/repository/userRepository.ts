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
        dobHidden?: boolean;
    }): Promise<number> {
        const sql = `
            INSERT INTO users (username, password, nicknames, dailyMood, dateOfBirth, dobHidden, theme, pronouns,
                               instantBuddy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result]: any = await pool.execute(sql, [
            user.username,
            user.password,
            user.nicknames,
            user.dailyMood ?? 'grey',
            user.dateOfBirth ?? null,
            user.dobHidden ? 1 : 0,
            user.theme ?? 'light',
            user.pronouns ?? 'hidden',
            user.instantBuddy === undefined ? 1 : (user.instantBuddy ? 1 : 0),

        ]);
        return result.insertId;
    }

    async getUserById(userid: number): Promise<any | null> {
        const sql = `SELECT *
                     FROM users
                     WHERE userid = ?`;
        const [rows]: any = await pool.execute(sql, [userid]);
        return rows[0] ?? null;
    }

    // Needed for login - T
    async getUserByUsername(username: string): Promise<any | null> {
        const sql = `SELECT *
                     FROM users
                     WHERE username = ?`;
        const [rows]: any = await pool.execute(sql, [username]);
        return rows[0] ?? null;
    }

    // allows partial updates, used to set dailyMood, theme, etc.
    async updateUser(userid: number, updates: {
        username?: string;
        password?: string;
        nicknames?: string;
        dailyMood?: string;
        dateOfBirth?: Date | null;
        dobHidden?: boolean;
        theme?: string;
        pronouns?: string;
        instantBuddy?: boolean;
    }): Promise<void> {
        const sql = `
            UPDATE users
            SET username     = COALESCE(?, username),
                password     = COALESCE(?, password),
                nicknames    = COALESCE(?, nicknames),
                dailyMood    = COALESCE(?, dailyMood),
                dateOfBirth  = COALESCE(?, dateOfBirth),
                dobHidden    = COALESCE(?, dobHidden),
                theme        = COALESCE(?, theme),
                pronouns     = COALESCE(?, pronouns),
                instantBuddy = COALESCE(?, instantBuddy)
            WHERE userid = ?
        `;
        await pool.execute(sql, [
            updates.username ?? null,
            updates.password ?? null,
            updates.nicknames ?? null,
            updates.dailyMood ?? null,
            updates.dateOfBirth ?? null,
            updates.dobHidden === undefined ? null : (updates.dobHidden ? 1 : 0),
            updates.theme ?? null,
            updates.pronouns ?? null,
            updates.instantBuddy === undefined ? null : (updates.instantBuddy ? 1 : 0),
            userid
        ]);
    }

    /**
     * Deletes a user and cleans up / pseudonymises references so foreign keys allow deletion.
     *
     * Behaviour:
     * - messages.sender and chatdata.admin are reassigned to fakeUserId.
     * - chatmembers entries are updated to fakeUserId (or removed if fake already exists in that chat).
     * - any chats that end up with ONLY members in (fakeUserId, systemUserId) are deleted.
     * - user-owned rows with no cascade are deleted (contacts, contact requests, mood history, scheduled messages).
     */
    async deleteUserAccountAndCleanup(
        userid: number,
        fakeUserId = 1,
        systemUserId = 2
    ): Promise<void> {
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            // 1) Pseudonymise message sender IDs
            await conn.execute(`UPDATE messages
                                SET sender = ?
                                WHERE sender = ?`, [fakeUserId, userid]);

            // 2) If user was group admin anywhere, point at fake user
            await conn.execute(`UPDATE chatdata
                                SET admin = ?
                                WHERE admin = ?`, [fakeUserId, userid]);

            // 3) Replace chat with fake user
            const [chatRows]: any = await conn.execute(
                `SELECT chatid
                 FROM chatmembers
                 WHERE userid = ?`,
                [userid]
            );
            const chatIds: number[] = (chatRows ?? []).map((r: any) => Number(r.chatid));

            for (const chatId of chatIds) {
                const [fakeRows]: any = await conn.execute(
                    `SELECT 1
                     FROM chatmembers
                     WHERE chatid = ?
                       AND userid = ? LIMIT 1`,
                    [chatId, fakeUserId]
                );

                if ((fakeRows ?? []).length > 0) {
                    // avoid duplicate PK (chatid, userid)
                    await conn.execute(`DELETE
                                        FROM chatmembers
                                        WHERE chatid = ?
                                          AND userid = ?`, [chatId, userid]);
                } else {
                    await conn.execute(
                        `UPDATE chatmembers
                         SET userid = ?
                         WHERE chatid = ?
                           AND userid = ?`,
                        [fakeUserId, chatId, userid]
                    );
                }
            }

            // 4) Remove rows that should simply disappear with the user
            await conn.execute(`DELETE
                                FROM scheduledmessages
                                WHERE userid = ?`, [userid]);
            await conn.execute(`DELETE
                                FROM moodhistory
                                WHERE userid = ?`, [userid]);
            await conn.execute(`DELETE
                                FROM contacts
                                WHERE userid1 = ?
                                   OR userid2 = ?`, [userid, userid]);
            await conn.execute(
                `DELETE
                 FROM contactrequests
                 WHERE useridReciever = ?
                    OR useridRequester = ?`,
                [userid, userid]
            );

            // 5) Delete chats that are now only (fake) and/or system user
            const [toDeleteRows]: any = await conn.execute(
                `SELECT chatid
                 FROM chatmembers
                 GROUP BY chatid
                 HAVING SUM(CASE WHEN userid NOT IN (?, ?) THEN 1 ELSE 0 END) = 0`,
                [fakeUserId, systemUserId]
            );

            const chatIdsToDelete: number[] = (toDeleteRows ?? []).map((r: any) => Number(r.chatid));

            if (chatIdsToDelete.length > 0) {
                // delete child rows first (prevents FK error on Membership)
                await conn.query(`DELETE
                                  FROM chatmembers
                                  WHERE chatid IN (?)`, [chatIdsToDelete]);

                // messages has ON DELETE CASCADE from chatdata, so this is optional,
                // but keeping it is fine if you prefer explicit cleanup:
                // await conn.query(`DELETE FROM messages WHERE chatid IN (?)`, [chatIdsToDelete]);

                await conn.query(`DELETE
                                  FROM chatdata
                                  WHERE chatId IN (?)`, [chatIdsToDelete]);
            }


            //delete user
            await conn.execute(`DELETE
                                FROM users
                                WHERE userid = ?`, [userid]);

            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

}

export const userRepository = new UserRepository();