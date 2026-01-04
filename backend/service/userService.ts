import { userRepository } from "../repository/userRepository";
import { chatRepository } from "../repository/chatRepository"; 
import { preferencesRepository } from "../repository/preferencesRepository"; 
import { chatService } from "../service/chatService";
import { scheduledMessageRepository } from "../repository/scheduledMessageRepository";

type CreateUserInput = {
  username: string;
  password: string;
  nicknames: string;
  dailyMood?: string;          // expects 'green' | 'orange' | 'red' | 'gray'
  dateOfBirth?: Date | null;
  theme?: string;              // 'light' | 'dark' | 'moody'
  pronouns?: string;           // 'he/him' | 'she/her' | 'they/them' | 'hidden'
  instantBuddy?: boolean;
};

type UpdateUserInput = Partial<CreateUserInput>;

class UserService {
  async createUser(input: CreateUserInput): Promise<number> {
    return userRepository.createUser(input);
  }

  async getUserById(userId: number): Promise<any | null> {
    return userRepository.getUserById(userId);
  }

  // optional helper to fetch all users if needed later
  // async getAllUsers(): Promise<any[]> {
  //   return userRepository.getAllUsers();
  // }

  
  async updateUser(userId: number, updates: UpdateUserInput): Promise<void> {
    const existing = await userRepository.getUserById(userId);
    if (!existing) throw new Error("User not found");
    await userRepository.updateUser(userId, updates);
  }

  // Delete user account and all associated data (if not relevant for other users, in which case pseudonymisation is performed)
  async deleteUserAccount(userId: number): Promise<void> {
    if (userId === 1) {
      throw new Error("Cannot delete fake user (userid=1)");
    }

    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("User not found");

    // 1. Get all chats (chatIds) the user is part of
    const chatIds = await chatRepository.getUserChatIds(userId);

    // 2. Decouple user from all chats (removal from chatMembers + pseudonymisation of messages - chat is deleted without remaining members)
    for (const chatId of chatIds) {
      await chatService.decoupleUserFromChat(chatId, userId, 1);
    }

    // 3. Delete scheduled messages
    await scheduledMessageRepository.deleteScheduledMessagesByUserId(userId);

    // 4. Delete preferences
    await preferencesRepository.deletePreferencesByUserId(userId);

    // 5. Delete user from users table
    await userRepository.deleteUser(userId);
  }
}

export const userService = new UserService();