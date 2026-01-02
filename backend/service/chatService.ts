import { chatRepository } from "../repository/chatRepository";
import { Chat } from "../modules/chat";

class ChatService {
  async createChat(members: number[]): Promise<number> {
    return chatRepository.createChat(members);
  }

  async getChatById(chatId: number): Promise<Chat> {
    const chatData = await chatRepository.getChatById(chatId);
    if (!chatData) throw new Error("Chat not found");
    
    const members = await chatRepository.getChatMembers(chatId);
    const messageIds = await chatRepository.getChatMessageIds(chatId);
    
    return new Chat(chatId, members, messageIds);
  }

  async getUserChats(userId: number): Promise<Chat[]> {
    const chats = await chatRepository.getUserChats(userId);
    const result: Chat[] = [];
    
    for (const chatData of chats) {
      const members = await chatRepository.getChatMembers(chatData.chatId);
      const messageIds = await chatRepository.getChatMessageIds(chatData.chatId);
      result.push(new Chat(chatData.chatId, members, messageIds));
    }
    
    return result;
  }

  async addMember(chatId: number, userId: number, requesterUserId: number): Promise<void> {
    const chat = await this.getChatById(chatId);
    
    if (!chat.members.includes(requesterUserId)) {
      throw new Error("Only chat members can add new members");
    }
    
    if (chat.members.includes(userId)) {
      throw new Error("User is already a member of this chat");
    }
    
    await chatRepository.addMember(chatId, userId);
  }

  async removeMember(chatId: number, userIdToRemove: number, requesterUserId: number): Promise<void> {
    const chat = await this.getChatById(chatId);
    
    // probably not needed, but convenient for testing
    if (!chat.members.includes(requesterUserId)) {
      throw new Error("Only chat members can remove members");
    }
    
    if (requesterUserId !== userIdToRemove) {
      throw new Error("You can only remove yourself");
    }
    
    await chatRepository.removeMember(chatId, userIdToRemove);
  }
}

export const chatService = new ChatService();