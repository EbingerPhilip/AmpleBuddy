import { chatRepository } from "../repository/chatRepository";
import { Chat } from "../modules/chat";
import { messageRepository } from "../repository/messageRepository";

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

  async getUserChats(userId: number): Promise<any[]> {
    const chatIds = await chatRepository.getUserChatIds(userId);
    const result: any[] = [];
    
    for (const chatId of chatIds) {
      const members = await chatRepository.getChatMembers(chatId);
      const messageIds = await chatRepository.getChatMessageIds(chatId);
      result.push(new Chat(chatId, members, messageIds));
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

  // Funktion to allow user to decouple from chat, currently triggers two actions:
  // 1. Remove user from chatMembers Table in DB
  // 2. Replace userId for all messages with a fake userId (pseudonymisation) (e.g., userId = 1)
  // ToDo: We need maintenance method to clean up chat table once all users have decoupled from chat

    async decoupleUserFromChat(chatId: number, userId: number, fakeUserId = 1): Promise<{ userDecoupled: boolean; chatDeleted: boolean }> {
    // 1. Remove user from chat members
    await chatRepository.removeMember(chatId, userId);
  
    // 2. Check if chat is now empty
    const members = await chatRepository.getChatMembers(chatId);

    // If chat has no members left: Intitialize cleanup
    if (members.length === 0) {
      // Delete all messages in this chat
      await messageRepository.deleteMessagesByChat(chatId);
      // Delete chat entry from chatdata table
      await chatRepository.deleteChat(chatId);
      return {userDecoupled: true, chatDeleted: true}
    // If chat has remeining members:
    } 

    //  Intitalize pseudonymization of userID 
    await messageRepository.pseudonymizeUserId(chatId, userId, fakeUserId);
    return {userDecoupled: true, chatDeleted: false}
    
  }
}

export const chatService = new ChatService();