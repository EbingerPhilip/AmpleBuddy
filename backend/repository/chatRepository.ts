const pool = require("../config/db");

class ChatRepository {
    // Create a new chat and return its chatId
    // Note that this part will have to be expanded later to accommedate group chats
  async createChat(members: number[]): Promise<number> {
    const sql = `INSERT INTO chatdata (\`group\`) VALUES (?)`; // Create empty chat to get chatId, DB does auto-increments
    const [result]: any = await pool.execute(sql, [false]); // Regular chat - set group to false = 0
    const chatId = result.insertId;

    // Add members to chatmembers table, based on previously assigned chatId
    for (const memberId of members) {
      const memberSql = `INSERT INTO chatmembers (chatid, userid) VALUES (?, ?)`;
      await pool.execute(memberSql, [chatId, memberId]);
    }

    return chatId;
  }

  async getChatById(chatId: number): Promise<any> {
    const sql = `SELECT * FROM chatdata WHERE chatId = ?`;
    const [rows]: any = await pool.execute(sql, [chatId]);
    return rows[0]; // Return only first row (no metadata)
  }

  async getChatMembers(chatId: number): Promise<number[]> {
    const sql = `SELECT userid FROM chatmembers WHERE chatid = ?`;
    const [rows]: any = await pool.execute(sql, [chatId]);
    return rows.map((row: any) => row.userid);
  }

  async getChatMessageIds(chatId: number): Promise<number[]> {
    const sql = `SELECT messageId FROM messages WHERE chatid = ? ORDER BY timeSent ASC`;
    const [rows]: any = await pool.execute(sql, [chatId]);
    return rows.map((row: any) => row.messageId);
  }

   async getUserChats(userId: number): Promise<any[]> {
    const sql = `SELECT DISTINCT c.* FROM chatdata c 
                 JOIN chatmembers cm ON c.chatId = cm.chatid 
                 WHERE cm.userid = ?`;
    const [rows]: any = await pool.execute(sql, [userId]);
    return rows;
  }

  async addMember(chatId: number, userId: number): Promise<void> {
    const sql = `INSERT INTO chatmembers (chatid, userid) VALUES (?, ?)`;
    await pool.execute(sql, [chatId, userId]);
  }

  async removeMember(chatId: number, userId: number): Promise<void> {
    const sql = `DELETE FROM chatmembers WHERE chatid = ? AND userid = ?`;
    await pool.execute(sql, [chatId, userId]);
  }
}

export const chatRepository = new ChatRepository();