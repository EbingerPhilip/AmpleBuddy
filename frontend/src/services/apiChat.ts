import { authFetch } from "../state/AuthFetch";

export type ChatMessageRow = {
    messageId: number;
    sender: number;
    nicknames: string;
    text: string;
    timeSent: string;
};

export async function apiGetChatMessages(chatId: number): Promise<ChatMessageRow[]> {
    const res = await authFetch(`/api/messages/chat/${chatId}`);
    if (!res.ok) throw new Error("Failed to load messages");
    const body = await res.json();
    return body.data as ChatMessageRow[];
}

export async function apiSendChatMessage(chatId: number, text: string): Promise<void> {
    const res = await authFetch(`/api/messages/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, text }),
    });
    if (!res.ok) throw new Error("Failed to send message");
}

export async function apiGetChatTitle(chatId: number): Promise<string> {
    const res = await authFetch(`/api/chats/${chatId}/title`);
    if (!res.ok) throw new Error("Failed to load chat title");
    const body = await res.json();
    return body.title as string;
}
