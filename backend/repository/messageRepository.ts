//import { pool } from "../config/db"; // ES Module import - does not work with current export style
const pool = require("../config/db"); // CommonJS require - works with current export style

class MessageRepository {
  async createMessage(userId: number, chatId: number, text: string): Promise<number> {
    const sql = `INSERT INTO messages (sender, chatid, text, timeSent) VALUES (?, ?, ?, NOW())`;
    const [result]: any = await pool.execute(sql, [userId, chatId, text]);
    return result.insertId; 
  }

  async getMessageById(messageId: number): Promise<any> {
    const sql = `SELECT * FROM messages WHERE messageId = ?`;
    const [rows]: any = await pool.execute(sql, [messageId]);
    return rows[0];
  }

  async updateMessage(messageId: number, newText: string): Promise<void> {
    const sql = `UPDATE messages SET text = ? WHERE messageId = ?`;
    await pool.execute(sql, [newText, messageId]);
  }

  async deleteMessage(messageId: number): Promise<void> {
    const sql = `DELETE FROM messages WHERE messageId = ?`;
    await pool.execute(sql, [messageId]);
  }

  async getMessagesByChatId(chatId: number): Promise<any[]> {
  const sql = `
    SELECT 
      m.messageId,
      m.sender,
      u.nicknames,
      m.text,
      m.timeSent
    FROM messages m
    JOIN users u ON m.sender = u.userid
    WHERE m.chatid = ?
    ORDER BY m.timeSent ASC
  `;
  const [rows]: any = await pool.execute(sql, [chatId]);
  return rows;
}

// For decoupling instant buddy chats: replace real userId with fake userId (e.g., 1)
 async pseudonymizeUserId(chatId: number, userId: number, fakeUserId = 1): Promise<void> {
    const sql = `UPDATE messages SET sender = ? WHERE chatid = ? AND sender = ?`;
    await pool.execute(sql, [fakeUserId, chatId, userId]);
  }


// Cleanup to delete all messages when a chat was deleted
async deleteMessagesByChat(chatId: number): Promise<void> {
const sql = `DELETE FROM messages WHERE chatid = ?`;
await pool.execute(sql, [chatId]);
}

}

export const messageRepository = new MessageRepository();