import {messageRepository} from "../repository/messageRepository";
import {chatRepository} from "../repository/chatRepository";


class MessageService {
    // Fetch message by ID
    async getMessageById(messageId: number): Promise<any> {
        const message = await messageRepository.getMessageById(messageId);
        if (!message) throw new Error("Message not found");
        return message;
    }

    // Validate that message exists and belongs to user - used for edit/delete operations
    // Changes are  only allowed within 10 minutes of sending (implementation of buisnessrule!)

    // Sending a new message
    async sendMessage(sender: number, chatId: number, text: string): Promise<number> {
        this.validateText(text);

        const isMember = await chatRepository.isUserInChat(chatId, sender);
        if (!isMember) {
            throw new Error("You are no longer a member of this chat.");
        }

        // Business rule: you cannot send messages to the deleted-user placeholder (userid = 1)
        // for 1-to-1 chats. Also: if the other participant has decoupled, the chat will have
        // only one remaining member -> treat that as "messaging a deleted user".
        const chatData = await chatRepository.getChatById(chatId);
        if (chatData && !chatData.group) {
            const members = await chatRepository.getChatMembers(chatId);

            // If the chat is no longer a real 1:1 (because the other user decoupled),
            // block sending using the same deleted-user rule.
            if (members.length !== 2) {
                throw new Error("You can't send messages to a deleted user.");
            }

            const other = members.find((id) => id !== sender);
            if (!other || other === 1) {
                throw new Error("You can't send messages to a deleted user.");
            }
        }
        return messageRepository.createMessage(sender, chatId, text);

    }

    // Actual edit action, save changes to DB
    async editMessage(messageId: number, sender: number, newText: string): Promise<void> {
        this.validateText(newText);
        await this.validateMessage(messageId, sender);
        await messageRepository.updateMessage(messageId, newText);
    }

    async deleteMessage(messageId: number, sender: number): Promise<void> {
        await this.validateMessage(messageId, sender);
        await messageRepository.deleteMessage(messageId);
    }

    // Retrieve all messages belonging to the same chat, based on chatID
    async getChatMessages(chatId: number): Promise<any[]> {
        return messageRepository.getMessagesByChatId(chatId);
    }

    async sendFile(sender: number, chatId: number, text: string, link: string): Promise<number> {
        // sendMessage already enforces membership + deleted-user/decouple rules
        const id = await this.sendMessage(sender, chatId, text);
        await messageRepository.saveMessageFile(id, chatId, link);
        return id;
    }

    // Basic validation for message text - currently "not empty" and "max length"
    private validateText(text: string) {
        if (!text || !text.trim()) throw new Error("Message text is required");
        if (text.length > 2000) throw new Error("Message text too long");
    }

    // It may be necessary to seperate into multiple functions later
    private async validateMessage(messageId: number, sender: number): Promise<any> {
        const existing = await messageRepository.getMessageById(messageId);
        if (!existing) throw new Error("Message not found");
        if (existing.sender !== sender) throw new Error("Not allowed to edit this message");
        const now = new Date();
        const messageTime = new Date(existing.timeSent);
        const diffInMinutes = (now.getTime() - messageTime.getTime()) / 60000;
        if (diffInMinutes > 10) throw new Error("Edit time window has expired");
        return existing;
    }

}

export const messageService = new MessageService();