import {chatRepository} from "../repository/chatRepository";
import {Chat} from "../modules/chat";
const pool = require("../config/db");

class ChatService {
    async createChat(members: number[]): Promise<number> {
        if (members?.includes(1)) {
            throw new Error("You can't message a deleted user.");
        }
        return chatRepository.createChat(members);

    }

    async getChatById(chatId: number): Promise<Chat> {
        const chatData = await chatRepository.getChatById(chatId);
        if (!chatData) throw new Error("Chat not found");

        const members = await chatRepository.getChatMembers(chatId);
        const messageIds = await chatRepository.getChatMessageIds(chatId);

        return new Chat(chatId, members, messageIds);
    }

    // Decouple (leave) a chat:
    // - user is removed from chatmembers (can no longer view the chat)
    // - all of their messages in that chat are pseudonymised to fakeUserId (default 1)
    // - if the chat only contains deleted users after the leave (userid=1), the chat is deleted
    async decoupleUserFromChat(
        chatId: number,
        userId: number,
        fakeUserId = 1
    ): Promise<{ userDecoupled: boolean; chatDeleted: boolean }> {
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            // Ensure the user is currently a member
            const [mRows]: any = await conn.execute(
                `SELECT 1
                 FROM chatmembers
                 WHERE chatid = ?
                   AND userid = ? LIMIT 1`,
                [chatId, userId]
            );
            if (!mRows || mRows.length === 0) {
                throw new Error("Not a member of this chat");
            }

            // 1) Pseudonymise their messages in this chat
            await conn.execute(
                `UPDATE messages
                 SET sender = ?
                 WHERE chatid = ?
                   AND sender = ?`,
                [fakeUserId, chatId, userId]
            );

            // 2) If group admin, temporarily drop admin
            await conn.execute(
                `UPDATE chatdata
                 SET admin = NULL
                 WHERE chatId = ?
                   AND admin = ?`,
                [chatId, userId]
            );

            // 3) Remove membership
            await conn.execute(`DELETE
                                FROM chatmembers
                                WHERE chatid = ?
                                  AND userid = ?`, [chatId, userId]);

            // 4) Cleanup: if ONLY deleted users (userid=1) remain (including group chats), delete chat.
            const [rows]: any = await conn.execute(
                `SELECT userid
                 FROM chatmembers
                 WHERE chatid = ?`,
                [chatId]
            );
            const remaining: number[] = (rows ?? []).map((r: any) => Number(r.userid));

            const [cdRows]: any = await conn.execute(
                `SELECT \`group\` AS isGroup, admin
                 FROM chatdata
                 WHERE chatId = ? LIMIT 1`,
                [chatId]
            );

            const isGroup = cdRows?.[0]?.isGroup === 1 || cdRows?.[0]?.isGroup === true;
            const currentAdmin = cdRows?.[0]?.admin;

            if (isGroup && (currentAdmin == null || Number(currentAdmin) === 1)) {
                const nextAdmin = remaining.find((id) => id !== 1 && id !== 2);
                if (nextAdmin) {
                    await conn.execute(`UPDATE chatdata
                                        SET admin = ?
                                        WHERE chatId = ?`, [nextAdmin, chatId]);
                }
            }

            const onlyDeletedUsersRemain = remaining.length === 0 || remaining.every((id) => id === fakeUserId);
            if (onlyDeletedUsersRemain) {
                // IMPORTANT: Membership FK has no cascade -> delete children first
                await conn.execute(`DELETE
                                    FROM chatmembers
                                    WHERE chatid = ?`, [chatId]);
                await conn.execute(`DELETE
                                    FROM chatdata
                                    WHERE chatId = ?`, [chatId]);
                // messages + messagefiles are removed by ON DELETE CASCADE from chatdata
                await conn.commit();
                return {userDecoupled: true, chatDeleted: true};
            }

            await conn.commit();
            return {userDecoupled: true, chatDeleted: false};
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

}

export const chatService = new ChatService();