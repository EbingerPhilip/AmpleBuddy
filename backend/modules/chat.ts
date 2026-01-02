// Divergence from class diagram: messageIds rather than Message-objects are stored in Chat
// this provides more efficent storage, better seperation of concerns and avoids issues with edited messages
export class Chat {
    chatid: number;
    members: number[];
    messageIds: number[];

    constructor(chatid: number, members: number[], messageIds: number[] = []) {
        this.chatid = chatid;
        this.members = members;
        this.messageIds = messageIds;
    }
}

module.exports = { Chat };