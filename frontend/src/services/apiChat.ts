import { authFetch } from "../state/AuthFetch";

export type ChatMessageRow = {
    messageId: number;
    sender: number;
    nicknames: string;
    text: string | null;
    timeSent: string;
    link?: string | null;
};

export type GroupChatDetails = {
    chatId: number;
    members: number[];
    messageIds: number[];
    groupname: string;
    admin: number;
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
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to send message");
    }
}

export async function apiSendChatFile(
    chatId: number,
    text: string,
    file: File
): Promise<{ messageId: number; link: string }> {
    const form = new FormData();
    form.append("chatId", String(chatId));
    form.append("text", text);
    form.append("file", file);

    const res = await authFetch(`/api/messages/sendFile`, {
        method: "POST",
        body: form,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to send file");
    }
    const body = await res.json();

    return { messageId: body.messageId as number, link: body.link as string };
}

export async function apiGetChatTitle(chatId: number): Promise<string> {
    const res = await authFetch(`/api/chats/${chatId}/title`);
    if (!res.ok) throw new Error("Failed to load chat title");
    const body = await res.json();
    return body.title as string;
}

export async function apiCreateChat(members: number[]): Promise<number> {
    const res = await authFetch(`/api/chats/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to create chat");
    }
    const body = await res.json();
    return body.chatId as number;
}

export async function apiDecoupleFromChat(chatId: number): Promise<{ chatDeleted: boolean }> {
    const res = await authFetch(`/api/chats/${chatId}/decouple`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to leave chat");
    }
    const body = await res.json().catch(() => null);
    return { chatDeleted: Boolean(body?.chatDeleted) };
}

export async function apiEditMessage(messageId: number, sender: number, text: string): Promise<void> {
    const res = await authFetch(`/api/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender, text }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to edit message");
    }
}

export async function apiCreateGroupChat(groupname: string, members: number[]): Promise<number> {
    const res = await authFetch(`/api/groupchats/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupname, members }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to create groupchat");
    }
    const body = await res.json();
    return body.chatId as number;
}

export async function apiGetGroupChat(chatId: number): Promise<GroupChatDetails> {
    const res = await authFetch(`/api/groupchats/${chatId}`);
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to load groupchat");
    }

    const body: any = await res.json();

    // Backend uses "chatid" (lowercase). Normalise to "chatId" for frontend.
    const normalised: GroupChatDetails = {
        chatId: Number(body.chatid ?? body.chatId ?? chatId),
        members: Array.isArray(body.members) ? body.members.map((n: any) => Number(n)) : [],
        messageIds: Array.isArray(body.messageIds) ? body.messageIds.map((n: any) => Number(n)) : [],
        groupname: String(body.groupname ?? ""),
        admin: Number(body.admin ?? 0),
    };

    return normalised;
}

export async function apiAddToGroupChat(chatId: number, targetUserId: number): Promise<void> {
    const res = await authFetch(`/api/groupchats/add`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, targetUserId }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to add member");
    }
}

export async function apiRemoveFromGroupChat(chatId: number, targetUserId: number): Promise<void> {
    const res = await authFetch(`/api/groupchats/remove`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, targetUserId }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to remove member");
    }
}

export async function apiRenameGroupChat(chatId: number, newGroupName: string): Promise<void> {
    const res = await authFetch(`/api/groupchats/${chatId}/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newGroupName }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to rename groupchat");
    }
}

export async function apiSetGroupChatAdmin(chatId: number, newAdminId: number): Promise<void> {
    const res = await authFetch(`/api/groupchats/${chatId}/admin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newAdminId }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to change admin");
    }
}
