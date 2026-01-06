// const pool = require('./db')
import {messageRepository} from "../repository/messageRepository";

export class Message {
    messageid: number;
    userid: number;
    chatid: number;
    timeSent: Date; // Changed from 'date' to 'timeSent' to avoid confusion with Date type
    text: string;

    constructor(messageid: number, userid: number, chatid: number, timeSent: Date, text: string) {
        this.messageid = messageid;
        this.userid = userid;
        this.chatid = chatid;
        this.timeSent = timeSent; // Fixed constructor to work with actual Timestamp from DB
        this.text = text;
    }

    static async create(userId: number, chatId: number, text: string): Promise<Message> {
    const messageId = await messageRepository.createMessage(userId, chatId, text);
    const messageData = await messageRepository.getMessageById(messageId); // Fetch the full message data, nessecary to get timestamp
    return new Message(
      messageData.messageid,
      messageData.userid,
      messageData.chatid,
      new Date(messageData.timeSent), // Convert string-timestamp to Date object
      messageData.text
    );
  }

    async edit(newText: string): Promise<void> {
        const now = new Date(); // Buisness logic was moved to service layer, only DB update including new timestamp remains here
        await messageRepository.updateMessage(this.messageid, newText);
        this.text = newText;
        this.timeSent = now;
    }

    
    static async findById(messageId: number): Promise<Message | null> {
    const messageData = await messageRepository.getMessageById(messageId);
    if (!messageData) return null;
    return new Message(
      messageData.messageid,
      messageData.userid,
      messageData.chatid,
      new Date(messageData.date),
      messageData.text
    );
  }
    async deleteMessage(): Promise<void> {
        await messageRepository.deleteMessage(this.messageid);
        console.log("Message " + this.messageid + " has been deleted!");
    }
}

module.exports = { Message };