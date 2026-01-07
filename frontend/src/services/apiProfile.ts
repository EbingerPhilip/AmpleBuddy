import { authFetch } from "../state/AuthFetch";

export type PronounsOption = "she/her" | "he/him" | "they/them" | "prefer not to say";

export type BuddyPreferences = {
    gender?: string;
    age?: string;
    minGreen?: number;
};

export type MyProfile = {
    userid: number;
    username: string;
    nicknames: string;
    dailyMood: string;
    dateOfBirth: string | null;
    dobHidden: number | 0 | 1;
    theme: "light" | "dark" | "colourblind";
    pronouns: string;
    instantBuddy: number | 0 | 1;
    hasProfilePic: boolean;
    profilePicUrl: string | null;
    preferences: BuddyPreferences | null;
    moodHistory: string[];
};

export type Mood = "green" | "yellow" | "red" | "gray";

export type MoodHistoryRow = {
    userid: number;
    mood: Mood;
    date: string; // YYYY-MM-DD
};

export async function apiGetMoodHistory(): Promise<MoodHistoryRow[]> {
    const res = await authFetch("/api/user/moodhistory");
    if (!res.ok) throw new Error("Failed to load mood history");
    const body = await res.json();
    return body.data as MoodHistoryRow[];
}

export async function apiGetMyProfile(): Promise<MyProfile> {
    const res = await authFetch("/api/user/me");
    if (!res.ok) throw new Error("Failed to load profile");
    const body = await res.json();
    return body.data as MyProfile;
}

export async function apiUpdateMyProfile(updates: {
    nicknames?: string;
    pronouns?: PronounsOption;
    dateOfBirth?: string; // YYYY-MM-DD
    dobHidden?: boolean;
    instantBuddy?: boolean;
    theme?: "light" | "dark" | "colourblind";
}): Promise<void> {
    const res = await authFetch("/api/user/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to update profile");
    }
}

export async function apiUploadProfilePic(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("profile-pics", file);

    const res = await authFetch("/api/user/profile-pics", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Failed to upload profile picture");

    const body = await res.json();
    return body.url as string;
}

export async function apiDeleteProfilePic(): Promise<void> {
    const res = await authFetch("/api/user/profile-pics", { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete profile picture");
}
