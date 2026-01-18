import {io, type Socket} from "socket.io-client";

let socket: Socket | null = null;

function ensureSocket(): Socket {
    if (socket) return socket;

    socket = io("https://localhost:3000", {
        autoConnect: false,
        transports: ["websocket", "polling"],
        timeout: 10000,
        reconnection: true,
    });

    return socket;
}

async function ensureConnected(): Promise<Socket> {
    const s = ensureSocket();
    if (s.connected) return s;

    return await new Promise<Socket>((resolve, reject) => {
        const onConnect = () => {
            cleanup();
            resolve(s);
        };
        const onErr = (err: any) => {
            cleanup();
            reject(err);
        };
        const cleanup = () => {
            s.off("connect", onConnect);
            s.off("connect_error", onErr);
        };

        s.on("connect", onConnect);
        s.on("connect_error", onErr);

        if (!s.active) s.connect();
    });
}

export async function enterChat(userId: number, chatId: number): Promise<void> {
    const s = await ensureConnected();
    s.emit("enterChat", userId, chatId);
}

export function onIncomingMessage(handler: (payload: any) => void): () => void {
    const s = ensureSocket();
    s.on("sendmessage", handler);
    return () => s.off("sendmessage", handler);
}

export async function socketSendMessage(sender: number, chatId: number, text: string): Promise<number> {
    const s = await ensureConnected();

    return await new Promise<number>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            cleanup();
            reject(new Error("Socket timeout"));
        }, 5000);

        const cleanup = () => {
            window.clearTimeout(timeout);
            s.off("sendMessageResponse", onOk);
            s.off("serverResponseError", onErr);
        };

        const onOk = (res: any) => {
            cleanup();
            if (res?.success && typeof res.messageId === "number") {
                resolve(res.messageId);
                return;
            }
            reject(new Error("Failed to send message"));
        };

        const onErr = (err: any) => {
            cleanup();
            reject(new Error(err?.error ?? "Socket error"));
        };

        s.on("sendMessageResponse", onOk);
        s.on("serverResponseError", onErr);

        s.emit("sendmessage", sender, chatId, text);
    });
}
