import { authFetch } from "../state/AuthFetch";

export type ChatMember = {
    userId: number;
    username: string;
    nickname: string;
};

export type ChatMessage = {
    messageId: number;
    senderId: number;
    content: string;
    sentAtIso: string;
};

export type Chat = {
    chatId: number;
    members: ChatMember[];
    lastMessage: ChatMessage | null;
};

export async function apiGetMyChats(): Promise<{ userId: number; chats: Chat[] }> {
    const res = await authFetch("/api/user/chats");

    if (!res.ok) {
        let msg = "Failed to load chats.";
        try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) msg = data.error;
        } catch { /* empty */ }
        throw new Error(msg);
    }

    return (await res.json()) as { userId: number; chats: Chat[] };
}
