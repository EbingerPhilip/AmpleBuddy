import { userRepository } from "../repository/userRepository";
import { chatRepository } from "../repository/chatRepository"; 
import { preferencesRepository } from "../repository/preferencesRepository"; 
import { chatService } from "./chatService";
import { scheduledMessageRepository } from "../repository/scheduledMessageRepository";
import { buddyPoolRepository } from "../repository/buddypoolRepository";
import { EDailyMood } from "../modules/user";
import { moodHistoryRepository } from "../repository/moodHistoryRepository";

type CreateUserInput = {
  username: string;
  password: string;
  nicknames: string;
  dailyMood?: string;          // expects 'green' | 'orange' | 'red' | 'gray'
  dateOfBirth?: Date | null;
  theme?: string;              // 'light' | 'dark' | 'colourblind'
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

  async getUserByUsername(username: string) {
      return userRepository.getUserByUsername(username);
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

  // Log daily mood and handle instant buddy matching
  // TODO: Add moodarchive to DB and implement log functionality

  // private helper to match and create chat - used for both red-green and green-red matching
    private async matchAndCreateChat(userId: number, buddy: { userid: number }): Promise<number> {
    const chatId = await chatService.createChat([userId, buddy.userid]);
    await buddyPoolRepository.incrementChatCount(userId);
    await buddyPoolRepository.incrementChatCount(buddy.userid);
    return chatId;
  }
  
  async logDailyMood(userId: number, mood: EDailyMood): Promise<{ matched: boolean; chatId?: number }> {
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("User not found");

    // 1) Update mood in users table 
    await userRepository.updateUser(userId, { dailyMood: mood });
    await moodHistoryRepository.upsertTodayMood(userId, mood);

    // 2) Only proceed with matching for instantBuddy = true
    if (!user.instantBuddy) return { matched: false };
    await buddyPoolRepository.addUser(userId, mood);

    // 3) Red mood: find green match or wait for buddy 
    // Note that the "wait for buddy" is actually set as "maxChatCount" when green user completes mood log
    if (mood === EDailyMood.red) {
      const buddy = await buddyPoolRepository.findByMoodLeastLoaded(EDailyMood.green);
      if (buddy) {
        const chatId = await this.matchAndCreateChat(userId, buddy);
        return { matched: true, chatId };
      }
    }

    // 4) Green mood: try to match with red user with chatCount < 1, otherwise add to pool
    if (mood === EDailyMood.green) {
      const buddy = await buddyPoolRepository.findByMoodNeedingBuddy(EDailyMood.red, 1);
      if (buddy) {
        const chatId = await this.matchAndCreateChat(userId, buddy);
        return { matched: true, chatId };
      }
    }
    return { matched: false };
  }
}

export const userService = new UserService();