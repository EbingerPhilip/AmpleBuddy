const pool = require("../config/db"); // CommonJS require - works with current export style
import {encrypt, decrypt} from "../config/encryption";

interface MessageRow {
    messageId: number;
    sender: number;
    nicknames: string;
    text: string | null;
    timeSent: Date;
}

class MessageRepository {
    async createMessage(userId: number, chatId: number, text: string): Promise<number> {
        const sql = `INSERT INTO messages (sender, chatid, text, timeSent)
                     VALUES (?, ?, ?, NOW())`;
        const [result]: any = await pool.execute(sql, [userId, chatId, encrypt(text)]);
        return result.insertId;
    }

    async getMessageById(messageId: number): Promise<any> {
        const sql = `SELECT *
                     FROM messages
                     WHERE messageId = ?`;
        const [rows]: any = await pool.execute(sql, [messageId]);
        const message = rows[0];
        message.text = decrypt(message.text)
        return message;
    }

    async updateMessage(messageId: number, newText: string): Promise<void> {
        const sql = `UPDATE messages
                     SET text = ?
                     WHERE messageId = ?`;
        await pool.execute(sql, [encrypt(newText), messageId]);
    }

    async deleteMessage(messageId: number): Promise<void> {
        const sql = `DELETE
                     FROM messages
                     WHERE messageId = ?`;
        await pool.execute(sql, [messageId]);
    }

    async getMessagesByChatId(chatId: number): Promise<any[]> {
        const sql = `
            SELECT m.messageId,
                   m.sender,
                   u.nicknames,
                   m.text,
                   m.timeSent,
                   f.link
            FROM messages m
                     JOIN users u ON m.sender = u.userid
                     LEFT JOIN messagefiles f ON f.messageid = m.messageId
            WHERE m.chatid = ?
            ORDER BY m.timeSent ASC
        `;
        const [rows]: any = await pool.execute(sql, [chatId]);
        return rows.map((row: MessageRow) => ({
            ...row,
            text: row.text ? decrypt(row.text) : null
        }));

    }

    async saveMessageFile(messageId: number, chatId: number, link: string): Promise<void> {
        const sql = `insert into messagefiles (messageid, chatid, link)
                     Values (?, ?, ?)`
        await pool.execute(sql, [messageId, chatId, link]);
    }

}

export const messageRepository = new MessageRepository();