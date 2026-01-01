
type Trigger = 'Red Day' | 'Yellow Day' | 'Date';

class ScheduledMessage {
    userid: number;
    text: string;
    trigger: Trigger;
    openOn: Date;

    constructor(userid: number, text: string, trigger: Trigger, openOn: Date) {
        this.userid = userid;
        this.text = text;
        this.openOn = openOn;
        this.trigger = trigger;
    }
}

module.exports = { ScheduledMessage };