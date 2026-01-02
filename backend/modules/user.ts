export class User {
    private userID: number;
    private username: string;
    private password: string;
    private nickname: string;
    private dailyMood: DailyMood;
    private dateOfBirth: Date | undefined;
    private Contacts: number[];
    private theme: Theme;
    private pronouns: Pronouns;
    private instantBuddy: boolean;

    constructor(
        userID: number,
        username: string,
        password: string,
        nickname: string,
        dateOfBirth?: Date,
    ) {
        this.userID = userID;
        this.username = username;
        this.password = password;
        this.nickname = nickname;
        this.dateOfBirth = dateOfBirth ?? undefined;

        this.theme = Theme.Light;
        this.pronouns = Pronouns.PreferNotToSay;
        this.dailyMood = DailyMood.Empty;
        this.instantBuddy = true;
        this.Contacts = [];
    }

    // ********** GETTER **********

    getUserID(): number{
        return this.userID;
    }
    getUsername(): string{
        return this.username;
    }
    getPassword(): string{
        return this.password;
    }
    getNickname(): string{
        return this.nickname;
    }
    getDailyMood(): DailyMood{
        return this.dailyMood;
    }
    getDateOfBirth(): Date{
        if (this.dateOfBirth == undefined) {
            return new Date(1, 1, 1);
        }
        return this.dateOfBirth;
    }
    getContacts(): number[]{
        return this.Contacts;
    }
    getTheme(): Theme{
        return this.theme;
    }
    getPronouns(): Pronouns{
        return this.pronouns;
    }
    getInstantBuddy(): boolean{
        return this.instantBuddy;
    }

    // ********** SETTER **********

    setUserID(userID: number){
        this.userID = userID;
    }
    setUsername(username: string){
        this.username = username;
    }
    setPassword(password: string){
        this.password = password;
    }
    setNickname(nickname: string){
        this.nickname = nickname;
    }
    setDailyMood(dailyMood: DailyMood){
        this.dailyMood = dailyMood;
    }
    setDateOfBirth(dateOfBirth: Date){
        this.dateOfBirth = dateOfBirth;
    }
    setContacts(contacts: number[]){
        this.Contacts = contacts;
    }
    setTheme(theme: Theme){
        this.theme = theme;
    }
    setPronouns(pronouns: Pronouns){
        this.pronouns = pronouns;
    }
    setInstantBuddy(instantBuddy: boolean){
        this.instantBuddy = instantBuddy;
    }

    // ********** FUNCTIONS **********

    sendContactRequest(userID: number) {}
    acceptContactRequest(userID: number) {}
    startChat(userID: number) {}
    startGroupchat(members: number[]) {}
    decoupleChat(chatID: number) {}
    sendMessage(chatID: number, text: string) {}
    sendScheduledMessage(text: string) {}
    deleteAccount(){}
    setMood(mood: DailyMood){}
}

export enum DailyMood {
    Green,
    Yellow,
    Red,
    Empty
}

export enum Theme {
    Light,
    Dark,
    ColourBlind
}

export enum Pronouns {
    PreferNotToSay,
    SheHer,
    HeHim,
    TheyThem
}
