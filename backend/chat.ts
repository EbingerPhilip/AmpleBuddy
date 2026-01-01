const { Message } = require("./message");

class Chat {
    chatid: number;
    Members: number[];
    Chatlog: any[];

    constructor(chatid: number, Members: number[]) {
        this.chatid = chatid;
        this.Members = Members;
        this.Chatlog = [];
    }
}

module.exports = { Chat };