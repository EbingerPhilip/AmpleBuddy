import {chatRepository} from "../repository/chatRepository";
import {messageService} from "../service/messageService";
import {chatService} from "../service/chatService";
import {messageRepository} from "../repository/messageRepository";
import {Server} from "socket.io";

interface ActiveUsers {
    userId: number;
    chatId: number;
    socketId: string;
}

function configureSockets(io:Server){

    let activeUsers: ActiveUsers[] = [];

    // @ts-ignore
    io.on('connection', socket => {
        console.log(`Socket ID: ${socket.id} connected`);
        // Optional: Verification that the client is a valid user

        socket.on('enterChat', (userId: number, chatId: number) => {
            activeUsers.push({userId: userId, chatId: chatId, socketId: socket.id});
        });

        socket.on('disconnect', () => {
            activeUsers = activeUsers.filter(user => user.socketId !== socket.id)
            console.log(`Socket ID: ${socket.id} disconnected`)
        });

        socket.on('sendmessage', async (sender: number, chatId: number, text: string) =>  {
            try {

                if (!chatId || !text) {
                    socket.emit('serverResponseError', {status: "400", error: "Missing required fields: chatId, text"});
                    return;
                }
                const isMember = await chatRepository.isUserInChat(Number(chatId), sender);
                if (!isMember) {
                    socket.emit('serverResponseError', {status: "403", error: "Not a member of this chat"});
                    return;
                }

                const msgId = await messageService.sendMessage(sender, Number(chatId), text);
                socket.emit('sendMessageResponse', {status: "201", success: true, messageId: msgId});

                const chatMembers = (await chatService.getChatMembers(chatId)).filter(x => x !== sender);

                for (const chatMembersKey in chatMembers) {
                    let user = activeUsers.find(x => x.userId == Number(chatMembersKey));
                    if(user){
                        const message = await messageRepository.getMessageById(msgId);
                        socket.to(user.socketId).emit('sendmessage', { success: true, data: message });
                    }
                }
            } catch (error: any) {
                socket.emit('serverResponseError', {status: "400", error: error.message});
            }
        });

        socket.on('editmessage', async (sender: number, text: string, messageId: number) => {
            try {
                if (!sender || !text) {
                    socket.emit('serverResponseError', {status: "400", error: "Missing required fields: sender, text"});
                    return;
                }

                await messageService.editMessage(messageId, Number(sender), text);
                socket.emit('editMessage', {status: "200", success: true, message: "Message updated"});
            } catch (error: any) {
                socket.emit('serverResponseError', {status: "400", error: error.message});
            }
        });

        socket.on('deletemessage', async (sender: number, messageId: number) => {
            try {
                if (!sender) {
                    socket.emit('serverResponseError', {status: "400", error: "Missing required field: sender"});
                    return;
                }

                await messageService.deleteMessage(messageId, Number(sender));
                socket.emit('deleteMessages', {status: "200", success: true, message: "Message deleted"});
            } catch (error: any) {
                socket.emit('serverResponseError', {status: "400", error: error.message});
            }
        });

        socket.on('getallmessages', async (userId: number, chatId: number) => {
            try {
                const isMember = await chatRepository.isUserInChat(chatId, userId);
                if (!isMember) {
                    socket.emit('serverResponseError', {status: "403", error: "Not a member of this chat"});
                }

                const messages = await messageService.getChatMessages(chatId);
                socket.emit('allMessages', {status: "200", success: true, data: messages});
            } catch (error: any) {
                socket.emit('serverResponseError', {status: "400", error: error.message});
            }
        });
    });

// @ts-ignore
    io.on('disconnect', (socket) => {
        activeUsers = activeUsers.filter(x => x.socketId === socket.id);
    });
}

export {configureSockets}
