import {Chat} from "./chat";

export class GroupChat extends Chat {
    groupname: string;
    admin: number;

    constructor(
        chatid: number,
        members: number[],
        messageIds: number[],
        groupname: string,
        admin: number
    ) {
        super(chatid, members, messageIds);
        this.groupname = groupname;
        this.admin = admin;
    }
}

module.exports = {GroupChat};