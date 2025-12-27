class User {
    private userid: number;

    private username: string;
    private password: string;
    private nickname: string;
    private dailyMood: EMood;
    private dateOfBirth: Date;
    private contacts: number[];
    private theme: ETheme;
    private pronouns: EPronouns;
    private instantBuddy: boolean;

    private conntactRequests: number[];


    public constructor(userid: number) {
        this.userid = userid;
    }

    public sendContractRequest(userId){

    }

    public acceptContactRequest(userId){

    }

    public startChat(userId){
        // TODO
    }

    public startGroupChat(){
        // TODO
    }

    public decoupleChat(userid){
        // TODO
    }

    public sendMessage(chatId){
        // TODO
    }

    public sendScheduledMessage(){
        // TODO
    }

    public deleteAcont(){

    }

    public setMood(){

    }


}

enum EMood {
    green,
    yellow,
    red
}

enum ETheme {
    light,
    dark,
    colour_blind
}

enum EPronouns{
    she="she/her",
    he="he/him",
    they="they/them",
    not="prefer not to say",
    notset="not set"
}