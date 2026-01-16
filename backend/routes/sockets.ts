import { chatRepository } from "../repository/chatRepository";
import { messageService } from "../service/messageService";
import { messageRepository } from "../repository/messageRepository";
import { Server } from "socket.io";

function chatRoom(chatId: number) {
    return `chat:${chatId}`;
}

function configureSockets(io: Server) {
    io.on("connection", (socket) => {
        console.log(`[SOCKET] connected ${socket.id}`);

        socket.on("enterChat", async (userId: number, chatId: number) => {
            try {
                const cid = Number(chatId);
                const uid = Number(userId);

                if (!Number.isFinite(cid) || cid <= 0 || !Number.isFinite(uid) || uid <= 0) {
                    socket.emit("serverResponseError", { status: "400", error: "Invalid enterChat payload" });
                    return;
                }

                // Optional: only allow joining if they are a member
                const isMember = await chatRepository.isUserInChat(cid, uid);
                if (!isMember) {
                    socket.emit("serverResponseError", { status: "403", error: "Not a member of this chat" });
                    return;
                }

                // Leave any previous chat:* rooms (so they only receive for the chat they’re viewing)
                for (const room of socket.rooms) {
                    if (typeof room === "string" && room.startsWith("chat:")) {
                        socket.leave(room);
                    }
                }

                socket.join(chatRoom(cid));
                socket.data.userId = uid;
                socket.data.chatId = cid;

                console.log(`[SOCKET] ${socket.id} entered chat ${cid} as user ${uid}`);
            } catch (e: any) {
                socket.emit("serverResponseError", { status: "400", error: e?.message ?? "enterChat failed" });
            }
        });

        socket.on("disconnect", () => {
            console.log(`[SOCKET] disconnected ${socket.id}`);
        });

        socket.on("sendmessage", async (sender: number, chatId: number, text: string) => {
            try {
                const cid = Number(chatId);
                const uid = Number(sender);

                if (!Number.isFinite(cid) || cid <= 0 || !Number.isFinite(uid) || uid <= 0 || !text?.trim()) {
                    socket.emit("serverResponseError", { status: "400", error: "Missing/invalid fields: sender, chatId, text" });
                    return;
                }

                const isMember = await chatRepository.isUserInChat(cid, uid);
                if (!isMember) {
                    socket.emit("serverResponseError", { status: "403", error: "Not a member of this chat" });
                    return;
                }

                const msgId = await messageService.sendMessage(uid, cid, text);
                socket.emit("sendMessageResponse", { status: "201", success: true, messageId: msgId });

                const message = await messageRepository.getMessageById(msgId);

                // Broadcast to everyone currently viewing this chat (except sender)
                socket.to(chatRoom(cid)).emit("sendmessage", { success: true, data: message });
            } catch (error: any) {
                socket.emit("serverResponseError", { status: "400", error: error?.message ?? "Unknown error" });
            }
        });

        socket.on("editmessage", async (sender: number, text: string, messageId: number) => {
            try {
                // Keep as-is if you want; edit/delete broadcasting can be added later.
                // For now, just confirm action back to sender.
                socket.emit("editMessage", { status: "200", success: true, message: "Message updated" });
            } catch (error: any) {
                socket.emit("serverResponseError", { status: "400", error: error?.message ?? "Unknown error" });
            }
        });

        socket.on("deletemessage", async (_sender: number, _messageId: number) => {
            try {
                socket.emit("deleteMessages", { status: "200", success: true, message: "Message deleted" });
            } catch (error: any) {
                socket.emit("serverResponseError", { status: "400", error: error?.message ?? "Unknown error" });
            }
        });

        socket.on("getallmessages", async (userId: number, chatId: number) => {
            try {
                const cid = Number(chatId);
                const uid = Number(userId);

                const isMember = await chatRepository.isUserInChat(cid, uid);
                if (!isMember) {
                    socket.emit("serverResponseError", { status: "403", error: "Not a member of this chat" });
                    return;
                }

                // If you still use this event anywhere, you can implement it properly later.
                socket.emit("allMessages", { status: "200", success: true, data: [] });
            } catch (error: any) {
                socket.emit("serverResponseError", { status: "400", error: error?.message ?? "Unknown error" });
            }
        });
    });
}

export { configureSockets };
