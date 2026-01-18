import {authFetch} from "../state/AuthFetch";

export type ContactUser = {
    userId: number;
    nickname: string;
    username: string;
};

export type ContactRequest = {
    useridReciever: number;
    useridRequester: number;
};

export async function apiGetContacts(userId: number): Promise<{ contacts: { userid1: number; userid2: number }[] }> {
    const res = await authFetch(`/api/contacts/getContacts/${userId}`);
    if (!res.ok) throw new Error("Failed to load contacts");
    return res.json();
}

export async function apiGetUserBasic(userId: number): Promise<{
    userid: number;
    username: string;
    nicknames: string
}> {
    const res = await authFetch(`/api/user/findUserId/${userId}`);
    if (!res.ok) throw new Error("Failed to load user");
    const body = await res.json();
    return body.data;
}

export async function apiGetMyContactRequests(): Promise<ContactRequest[]> {
    const res = await authFetch(`/api/contactRequests/mine`);
    if (!res.ok) throw new Error("Failed to load contact requests");
    const body = await res.json();
    return body.requests as ContactRequest[];
}

export async function apiSendContactRequest(username: string): Promise<void> {
    const res = await authFetch(`/api/contactRequests/send`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username}),
    });
    if (!res.ok) throw new Error("Failed to send contact request");
}

export async function apiAcceptContactRequest(requesterId: number): Promise<void> {
    const res = await authFetch(`/api/contactRequests/accept`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({requesterId}),
    });
    if (!res.ok) throw new Error("Failed to accept request");
}

export async function apiDenyContactRequest(requesterId: number): Promise<void> {
    const res = await authFetch(`/api/contactRequests/deny`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({requesterId}),
    });
    if (!res.ok) throw new Error("Failed to deny request");
}
