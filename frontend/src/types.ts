export type Contact = {
    nickname: string;
    userid: number;
    username: string;
};

export type User = {
    nickname: string;
    userid: number;
    username: string;
    Contacts: Contact[];
};

