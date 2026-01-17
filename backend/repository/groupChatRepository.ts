const pool = require("../config/db");

class GroupChatRepository {
  async createGroupChat(
    members: number[],
    groupname: string,
    admin: number
  ): Promise<number> {
    const sql = `INSERT INTO chatdata (\`group\`, admin, groupname) VALUES (?, ?, ?)`;
    const [result]: any = await pool.execute(sql, [true, admin, groupname]);
    const chatId = result.insertId;

    // Add all members to chatmembers table
    for (const memberId of members) {
      const memberSql = `INSERT INTO chatmembers (chatid, userid) VALUES (?, ?)`;
      await pool.execute(memberSql, [chatId, memberId]);
    }

    return chatId;
  }

  async getGroupChatById(chatId: number): Promise<any> {
    const sql = `SELECT * FROM chatdata WHERE chatId = ? AND \`group\` = 1`;
    const [rows]: any = await pool.execute(sql, [chatId]);
    return rows[0];
  }

  async getGroupChatMembers(chatId: number): Promise<number[]> {
    const sql = `SELECT userid FROM chatmembers WHERE chatid = ?`;
    const [rows]: any = await pool.execute(sql, [chatId]);
    return rows.map((row: any) => row.userid);
  }

  async getGroupChatMessageIds(chatId: number): Promise<number[]> {
    const sql = `SELECT messageId FROM messages WHERE chatid = ? ORDER BY timeSent ASC`;
    const [rows]: any = await pool.execute(sql, [chatId]);
    return rows.map((row: any) => row.messageId);
  }

  async getGroupChatAdmin(chatId: number): Promise<number | null> {
    const sql = `SELECT admin FROM chatdata WHERE chatId = ? AND \`group\` = 1`;
    const [rows]: any = await pool.execute(sql, [chatId]);
    return rows[0]?.admin || null;
  }

  async addMemberToGroupChat(chatId: number, userId: number): Promise<void> {
    const sql = `INSERT INTO chatmembers (chatid, userid) VALUES (?, ?)`;
    await pool.execute(sql, [chatId, userId]);
  }

  async removeMemberFromGroupChat(chatId: number, userId: number): Promise<void> {
    const sql = `DELETE FROM chatmembers WHERE chatid = ? AND userid = ?`;
    await pool.execute(sql, [chatId, userId]);
  }

  async updateGroupChatName(chatId: number, groupname: string): Promise<void> {
    const sql = `UPDATE chatdata SET groupname = ? WHERE chatId = ? AND \`group\` = 1`;
    await pool.execute(sql, [groupname, chatId]);
  }

  async updateGroupChatAdmin(chatId: number, admin: number): Promise<void> {
      const sql = `UPDATE chatdata SET admin = ? WHERE chatId = ? AND \`group\` = 1`;
      await pool.execute(sql, [admin, chatId]);
  }
}

export const groupChatRepository = new GroupChatRepository();