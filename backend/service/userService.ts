import { userRepository } from "../repository/userRepository";
import { chatRepository } from "../repository/chatRepository"; 
import { preferencesRepository } from "../repository/preferencesRepository"; 
import { chatService } from "./chatService";
import { scheduledMessageRepository } from "../repository/scheduledMessageRepository";
import { buddyPoolRepository } from "../repository/buddypoolRepository";
import { EDailyMood } from "../modules/user";
import { moodHistoryRepository } from "../repository/moodHistoryRepository";
import { Preferences } from "../modules/preferences";
import { verifyPassword } from "../config/encryption";

type CreateUserInput = {
  username: string;
  password: string;
  nicknames: string;
  dailyMood?: string;          // expects 'green' | 'orange' | 'red' | 'grey'
  dateOfBirth?: Date | null;
  theme?: string;              // 'light' | 'dark' | 'colourblind'
  pronouns?: string;           // 'he/him' | 'she/her' | 'they/them' | 'hidden'
  instantBuddy?: boolean;
};

type UpdateUserInput = Partial<CreateUserInput>;

type BuddyMatchResult = { matched: boolean; chatId?: number };

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

  async updateUser(userId: number, updates: UpdateUserInput): Promise<void> {
    const existing = await userRepository.getUserById(userId);
    if (!existing) throw new Error("User not found");
    await userRepository.updateUser(userId, updates);
  }

    /**
     * Delete the *currently logged in* user.
     * - Requires the correct password.
     * - Pseudonymises chat membership + messages to userid=1.
     * - Deletes chats that end up containing only userid 1 and/or 2.
     */
    async deleteOwnAccount(userId: number, plainPassword: string): Promise<void> {
        if (userId === 1 || userId === 2) {
            throw new Error("Cannot delete system users (userid=1 or userid=2)");
        }

        const user = await userRepository.getUserById(userId);
        if (!user) throw new Error("User not found");

        const ok = await verifyPassword(user.password, plainPassword);
        if (!ok) throw new Error("Invalid password");

        await userRepository.deleteUserAccountAndCleanup(userId, 1, 2);
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
    private async MatchAndCreateChat(userId: number, buddy: { userid: number }): Promise<number> {
    const chatId = await chatService.createChat([userId, buddy.userid]);
    await buddyPoolRepository.incrementChatCount(userId);
    await buddyPoolRepository.incrementChatCount(buddy.userid);
    return chatId;
  }

  // advanced matching logic - green users are added to buddypool with pronouns, greenstreak and age
  // "emergency matching" for red users without any buddies is performend here as well (disregarding preferences)
  private async advancedBuddyMatchingGreen(userId: number, mood: EDailyMood): Promise<BuddyMatchResult> {
    console.log("[advancedBuddyMatchingGreen] EDailyMood:", EDailyMood);
    console.log("[advancedBuddyMatchingGreen] Searching for red buddy...");
    const buddy = await buddyPoolRepository.emergencyBuddyMatch(EDailyMood.red, 1);
      if (buddy) {
        const chatId = await this.MatchAndCreateChat(userId, buddy);
        console.log("[advancedBuddyMatchingGreen] Found buddy for emergency matching! UserId:", buddy, "ChatId:", chatId);
        return { matched: true, chatId };
      }
    return { matched: false };
  }

  // advanced matching logic considering pronouns, greenstreak, and age
  private async advancedBuddyMatchingRed(userId: number, mood: EDailyMood): Promise<BuddyMatchResult> {
    // fetch user preferences if any
      const preferences: any = await preferencesRepository.getPreferencesByUserId(userId);

// translate gender enum to pronouns enum for buddy matching
      const genderToPronounsMap: { [key: string]: string } = {
          male: "he/him",
          female: "she/her",
          other: "they/them",
          hidden: "hidden",
      };

      const gender: string | null = preferences?.gender ?? null;
      const pronounsPreference: string | null = gender ? (genderToPronounsMap[gender] ?? null) : null;

      const minGreenstreak: number | null = preferences?.minGreen ?? null;

// Age range support (preferred range). Keep old "age" as fallback.
      const ageMin: number | null = preferences?.ageMin ?? null;
      const ageMax: number | null = preferences?.ageMax ?? null;
      const ageSingle: number | null = preferences?.age ?? null;

// Convert range to DOB bounds (DOB between oldest and youngest)
      const dobOldest = ageMax ? Preferences.getDateOfBirthFromAge(ageMax) : null; // older -> earlier
      const dobYoungest = ageMin ? Preferences.getDateOfBirthFromAge(ageMin) : null;

// Sorting target: midpoint of range if present, else single age
      let dobTarget: Date | null = null;
      if (ageMin && ageMax) {
          const mid = Math.round((ageMin + ageMax) / 2);
          dobTarget = Preferences.getDateOfBirthFromAge(mid);
      } else if (ageSingle) {
          dobTarget = Preferences.getDateOfBirthFromAge(ageSingle);
      }

      const buddy = await buddyPoolRepository.findBestGreenBuddy(
          pronounsPreference,
          minGreenstreak,
          dobTarget,
          dobOldest,
          dobYoungest
      );


      if (buddy) {
        const chatId = await this.MatchAndCreateChat(userId, buddy);
        console.log("[advancedBuddyMatchingRed] Matched with buddy:", buddy, "Chat ID:", chatId);
        return { matched: true, chatId };

      }
    return { matched: false };
  }
  
  // basic matching as before, based only on mood and load balancing - kept for reference
  private async basicBuddyMatching(userId: number, mood: EDailyMood): Promise<BuddyMatchResult> {
    // 3) Red mood: find green match or wait for buddy 
    // Note that the "wait for buddy" is actually set as "maxChatCount" when green user completes mood log
    if (mood === EDailyMood.red) {
      const buddy = await buddyPoolRepository.findByMoodLeastLoaded(EDailyMood.green);
      if (buddy) {
        const chatId = await this.MatchAndCreateChat(userId, buddy);
        return { matched: true, chatId };
      }
    }

    // 4) Green mood: try to match with red user with chatCount < 1, otherwise add to pool
    if (mood === EDailyMood.green) {
      const buddy = await buddyPoolRepository.emergencyBuddyMatch(EDailyMood.red, 1);
      if (buddy) {
        const chatId = await this.MatchAndCreateChat(userId, buddy);
        return { matched: true, chatId };
      }
    }
    return { matched: false };

  }
  //
    async logDailyMood(userId: number, mood: EDailyMood) {
        console.log("[logDailyMood] Start - userId:", userId, "mood:", mood);

        const user = await userRepository.getUserById(userId);
        if (!user) throw new Error("User not found");

        // 1) Always update mood in users table and moodhistory for today (allows changing mood)
        await userRepository.updateUser(userId, { dailyMood: mood });
        await moodHistoryRepository.upsertTodayMood(userId, mood);
        console.log("[logDailyMood] Mood logged/updated for today");

        // 2) Buddy pool behaviour rules
        const inPool = await buddyPoolRepository.getUser(userId);

        // If instantBuddy is OFF -> remove from pool and stop
        if (!user.instantBuddy) {
            if (inPool) {
                await buddyPoolRepository.removeUser(userId);
                console.log("[logDailyMood] instantBuddy off -> removed from buddypool");
            }
            return { matched: false };
        }

        // instantBuddy ON:
        // If mood is yellow or grey -> remove from pool and stop (no matching)
        if (mood === EDailyMood.yellow || mood === EDailyMood.grey) {
            if (inPool) {
                await buddyPoolRepository.removeUser(userId);
                console.log("[logDailyMood] Mood yellow/grey -> removed from buddypool");
            } else {
                console.log("[logDailyMood] Mood yellow/grey -> not in pool, no action");
            }
            return { matched: false };
        }

        // Mood is red or green (instantBuddy ON)
        if (!inPool) {
            // Add if not in pool
            await buddyPoolRepository.addUser(userId, mood);
            console.log("[logDailyMood] Added to buddypool (was not in pool)");
        } else if (inPool.mood !== mood) {
            // Remove and re-add if mood changed
            await buddyPoolRepository.removeUser(userId);
            await buddyPoolRepository.addUser(userId, mood);
            console.log("[logDailyMood] Mood changed -> removed and re-added to buddypool");
        } else {
            // Leave unchanged if mood did not change
            console.log("[logDailyMood] Mood unchanged and already in pool -> no pool change");
        }

        // 3) Matching only for red/green
        if (mood === EDailyMood.red) {
            return await this.advancedBuddyMatchingRed(userId, mood);
        }

        if (mood === EDailyMood.green) {
            return await this.advancedBuddyMatchingGreen(userId, mood);
        }

        return { matched: false };
    }



}

export const userService = new UserService();