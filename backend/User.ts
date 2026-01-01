import {isDate} from "util/types";

class User {
    private userid: number;

    private username: string;
    private password: string;   // encrypted with AES-256, encryption happens on client side.
    private nickname: string;
    private dailyMood: EMood;
    private dateOfBirth: Date;
    private contacts: number[];
    private theme: ETheme;
    private pronouns: EPronouns;
    private instantBuddy: boolean;
    private moodHistory: EMood[] = [];

    private contactRequests: number[]; // Used to store contact request which have not been answered jet.


    public constructor(userid: number) {
        this.userid = userid;
    }

    public setUserName(username: string){
        this.username = username;
    }

    public getUserName(){
        return this.username;
    }

    public checkPassword(password: string){
        if(this.password === password) return true;
        return false;
    }

    public setNickname(nickname: string){
        this.nickname = nickname
    }

    public setDateOfBirth(dateofbirth: Date){
        if(!isDate(this.dateOfBirth)){
            this.dateOfBirth = dateofbirth;
            return "Date of Brith set.";
        }
        return "Date already set.";
    }

    public getDateOfBirth(){
        return this.dateOfBirth;
    }

    public getContacts(){
        return this.contacts;
    }

    // retrieves the Contact data from the db.
    public updateContacts(){
        // TODO: DB Access
    }

    public setTheme(theme: ETheme){
        this.theme = theme;
    }

    public getTheme(){
        return this.theme;
    }

    public setPronouns(pronouns: EPronouns){
        this.pronouns = pronouns;
    }

    public getPronouns(){
        return this.pronouns;
    }


    public setInstantBuddy(instandBuddy: boolean){
        this.instantBuddy = instandBuddy;
    }

    public getInstandBuddy(){
        return this.instantBuddy;
    }

    public getMoodHistory(){
        // TODO: DB Access
    }

    public updateMoodHistory(){
        // TODO: DB Access
    }

    public editUser(username: string, password: string, nickname: string, dateOfBirth: Date, theme: ETheme, pronouns: EPronouns,  instantBuddy: boolean){
        this.username = username;
        this.password = password;
        this.nickname = nickname;
        this.dateOfBirth = dateOfBirth;
        this.theme = theme;
        this.pronouns = pronouns;
        this.instantBuddy = instantBuddy;

        this.updateContacts();
    }

    // TODO For many methods the DB Access or classes are missing
    public sendContractRequest(userId){
        // TODO: DB Access
    }

    public acceptContactRequest(userId){
        // TODO: DB Access

        this.updateContacts();
    }

    public startChat(userId){
        // TODO: DB Access, Classes
    }

    public startGroupChat(){
        // TODO: DB Access, Classes
    }

    public decoupleChat(userid){
        // TODO: DB Access, Classes
    }

    public sendMessage(chatId){
        // TODO: DB Access, CLasses
    }

    public sendScheduledMessage(){
        // TODO: DB Access, Classes
    }

    public deleteAcont(){
        // TODO: DB Access
    }

    public setMood(mood: EMood){
        this.dailyMood = mood;

        // TODO: DB Access
        // set Mood in DB
    }


}

export enum EMood {
    green,
    yellow,
    red
}

export enum ETheme {
    light,
    dark,
    colour_blind
}

export enum EPronouns{
    she="she/her",
    he="he/him",
    they="they/them",
    not="prefer not to say",
    notset="not set"
}