const pool = require("../config/db");
import { encrypt,decrypt } from "../config/encryption";


// general note regarding SQL: trigger is a reserved word, therefore it needs to be enclosed in backticks (`) when used as a column name
type Trigger = 'Red Day' | 'Yellow Day' | 'Date';
interface scheduledMessagerow{
    userId: number,
    text: string,
    trigger: Trigger,
    duedate: Date | null
}

class ScheduledMessageRepository {
  async createScheduledMessage(
    userId: number,
    text: string,
    trigger: Trigger,
    duedate: Date | null
  ): Promise<number> {
    const sql = `INSERT INTO scheduledmessages (userid, text, \`trigger\`, duedate) VALUES (?, ?, ?, ?)`;
    const [result]: any = await pool.execute(sql, [userId, encrypt(text), trigger, duedate]);
    return result.insertId;
  }

  async getScheduledMessageById(messageId: number): Promise<any> {
    const sql = `SELECT * FROM scheduledmessages WHERE messageId = ?`;
    const [rows]: any = await pool.execute(sql, [messageId]);
    const message = rows[0];
    message.text = decrypt(message.text)
    return message;;
  }

  async getScheduledMessagesByUserId(userId: number): Promise<any[]> {
    const sql = `SELECT * FROM scheduledmessages WHERE userid = ?`;
    const [rows]: any = await pool.execute(sql, [userId]);
    return rows.map((row: scheduledMessagerow) => ({
      ...row,
      text: row.text ? decrypt(row.text) : null
    }));;
  }

  async updateScheduledMessage(
    messageId: number,
    text: string,
    trigger: Trigger,
    duedate: Date | null
  ): Promise<void> {
    const sql = `UPDATE scheduledmessages SET text = ?, \`trigger\` = ?, duedate = ? WHERE messageId = ?`;
    await pool.execute(sql, [encrypt(text), trigger, duedate, messageId]);
  }

  async deleteScheduledMessage(messageId: number): Promise<void> {
    const sql = `DELETE FROM scheduledmessages WHERE messageId = ?`;
    await pool.execute(sql, [messageId]);
  }

  async deleteScheduledMessagesByUserId(userId: number): Promise<void> {
    const sql = `DELETE FROM scheduledmessages WHERE userid = ?`;
    await pool.execute(sql, [userId]);
  }
}

export const scheduledMessageRepository = new ScheduledMessageRepository();