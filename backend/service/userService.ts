import {userRepository} from "../repository/userRepository";
import {preferencesRepository} from "../repository/preferencesRepository";
import {chatService} from "./chatService";
import {buddyPoolRepository} from "../repository/buddypoolRepository";
import {EDailyMood} from "../modules/user";
import {moodHistoryRepository} from "../repository/moodHistoryRepository";
import {Preferences} from "../modules/preferences";
import {verifyPassword} from "../config/encryption";

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

    async logDailyMood(userId: number, mood: EDailyMood) {
        console.log("[logDailyMood] Start - userId:", userId, "mood:", mood);

        const user = await userRepository.getUserById(userId);
        if (!user) throw new Error("User not found");

        // 1) Always update mood in users table and moodhistory for today (allows changing mood)
        await userRepository.updateUser(userId, {dailyMood: mood});
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
            return {matched: false};
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
            return {matched: false};
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
        return {matched: false};
    }

    // advanced matching logic - green users are added to buddypool with pronouns, greenstreak and age

    // private helper to match and create chat - used for both red-green and green-red matching
    private async MatchAndCreateChat(userId: number, buddy: { userid: number }): Promise<number> {
        const chatId = await chatService.createChat([userId, buddy.userid]);
        await buddyPoolRepository.incrementChatCount(userId);
        await buddyPoolRepository.incrementChatCount(buddy.userid);
        return chatId;
    }

    // "emergency matching" for red users without any buddies is performend here as well (disregarding preferences)
    private async advancedBuddyMatchingGreen(userId: number, mood: EDailyMood): Promise<BuddyMatchResult> {
        console.log("[advancedBuddyMatchingGreen] EDailyMood:", EDailyMood);
        console.log("[advancedBuddyMatchingGreen] Searching for red buddy...");
        const buddy = await buddyPoolRepository.emergencyBuddyMatch(EDailyMood.red, 1);
        if (buddy) {
            const chatId = await this.MatchAndCreateChat(userId, buddy);
            console.log("[advancedBuddyMatchingGreen] Found buddy for emergency matching! UserId:", buddy, "ChatId:", chatId);
            return {matched: true, chatId};
        }
        return {matched: false};
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
            return {matched: true, chatId};

        }
        return {matched: false};
    }
}

export const userService = new UserService();