
const { Chat } = require("./chat");
const { Message } = require("./message");
const pool = require('./db');

class UserFunctions {
    userid: number;

    constructor(userid: number) {
        this.userid = userid;
    }


    async startChat(partnerId: number) {
        const sqlChat = "INSERT INTO chatdata (`group`, admin, groupname) VALUES ('0', ?, 'Private Chat')";
        const [result]: any = await pool.execute(sqlChat, [this.userid]);

        const newChatId = result.insertId;

        const sqlMember = "INSERT INTO chatmembers (chatid, userid) VALUES (?, ?)";

        await pool.execute(sqlMember, [newChatId, this.userid]);

        await pool.execute(sqlMember, [newChatId, partnerId]);

        console.log("New chat created with ID: " + newChatId);
        return new Chat(newChatId, [this.userid, partnerId]);
    }


    async sendMessage(chatId: number, text: string): Promise<void> {

        const now = new Date();

        const sql = "INSERT INTO messages (userid, chatid, text, time) VALUES (?, ?, ?, ?)";

        const [result]: any = await pool.execute(sql, [this.userid, chatId, text, now]);

        const realMessageId = result.insertId;

        const newMessage = new Message(realMessageId, this.userid, chatId, text);

        console.log("Message successfully saved to database with ID: " + realMessageId);
    }

    async sendScheduledMessage(text: string, trigger: 'Red Day' | 'Yellow Day' | 'Date', openOn: Date): Promise<void> {
        const sql = 'INSERT INTO scheduledmessages (userid, text, `trigger`, duedate) VALUES (?, ?, ?, ?)';

        await pool.execute(sql, [this.userid, text, trigger, openOn]);

        console.log("Message has been successfully saved on database!");
    }
}

module.exports = { User: UserFunctions };