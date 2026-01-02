import { Message } from "./message";

type Trigger = 'Red Day' | 'Yellow Day' | 'Date';

class ScheduledMessage extends Message {
    trigger: Trigger;
    openOn: Date;

    constructor(
        messageid: number,
        userid: number,
        chatid: number,
        timeSent: Date,
        text: string,
        trigger: Trigger,
        openOn: Date
    ) {
        super(messageid, userid, chatid, timeSent, text);
        this.trigger = trigger;
        this.openOn = openOn;
    }
}

export { ScheduledMessage };