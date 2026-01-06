import { messageRepository } from "../repository/messageRepository";

class MessageService {
    // Basic validation for message text - currently "not empty" and "max length"
  private validateText(text: string) {
    if (!text || !text.trim()) throw new Error("Message text is required");
    if (text.length > 2000) throw new Error("Message text too long");
  }

  // Validate that message exists and belongs to user - used for edit/delete operations
  // Changes are  only allowed within 10 minutes of sending (implementation of buisnessrule!)
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

  // Fetch message by ID
  async getMessageById(messageId: number): Promise<any> {
    const message = await messageRepository.getMessageById(messageId);
    if (!message) throw new Error("Message not found");
    return message;
  }

  // Sending a new message
  async sendMessage(sender: number, chatId: number, text: string): Promise<number> {
    this.validateText(text);
    return messageRepository.createMessage(sender, chatId, text);
  }

  // For pre-filling edit form - redundant?
  async getMessageForEdit(messageId: number, sender: number): Promise<string> {
    const message = await this.validateMessage(messageId, sender);
    return message.text;
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
}

export const messageService = new MessageService();