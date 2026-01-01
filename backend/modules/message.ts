const pool = require('./db')
class Message {
    messageid: number;
    userid: number;
    chatid: number;
    date: Date;
    text: string;

    constructor(messageid: number, userid: number, chatid: number, text: string) {
        this.messageid = messageid;
        this.userid = userid;
        this.chatid = chatid;
        this.date = new Date();
        this.text = text;
    }

    async editMessage(newtext: string): Promise<void> {
        const now = new Date();
        const diffinminutes = (now.getTime() - this.date.getTime()) / 60000;
        if (diffinminutes > 5) {
            console.error("Error: you cannot edit the message!");
            return;
        }
        this.text = newtext;
        const sql = 'UPDATE messages SET text = ? WHERE messageid = ?';
        await pool.execute(sql, [newtext, this.messageid]);
         console.log("Message edited: " + this.text);

    }
    async deleteMessage(): Promise<void> {
        const sql = 'DELETE FROM messages WHERE messageid = ?';
        await pool.execute(sql, [this.messageid]);
        console.log("Message " + this.messageid + " has been deleted!");

    }
}

module.exports = { Message };