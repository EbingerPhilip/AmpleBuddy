import { authFetch } from "../state/AuthFetch";
import { loadSession } from "../state/AuthStorage";


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

type ChatPreview = {
    chatId: number;
    group: number; // 0 or 1 from backend, tells me if this is a groupchat or naht
    sender: number | null;
    text: string | null;
    otherUserId: number | null;
    otherUserNickname: string | null;
    sendernickname: string | null;
    groupname: string | null;
    messageId: number | null;
};

export async function apiGetMyChats(): Promise<{ userId: number; chats: Chat[] }> {
    const session = loadSession();
    if (!session) {
        throw new Error("Not logged in.");
    }

    const res = await authFetch("/api/previews/chats/all");

    if (!res.ok) {
        let msg = "Failed to load chats.";
        try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) msg = data.error;
        } catch { /* empty */ }
        throw new Error(msg);
    }

    const previews = (await res.json()) as ChatPreview[];

    const chats: Chat[] = previews.map((p) => {
        const isGroup = p.group === 1;

        const members: ChatMember[] = [];
        if (!isGroup && p.otherUserId) {
            members.push({
                userId: p.otherUserId,
                username: p.otherUserNickname ?? "",
                nickname: p.otherUserNickname ?? "",
            });
        }

        const lastMessage: ChatMessage | null =
            p.messageId && p.sender && p.text != null
                ? {
                    messageId: p.messageId,
                    senderId: p.sender,
                    content: p.text,
                    sentAtIso: "", // no timestamps
                }
                : null;

        return {
            chatId: p.chatId,
            members,
            lastMessage,
        };
    });

    return { userId: session.userId, chats };
}

