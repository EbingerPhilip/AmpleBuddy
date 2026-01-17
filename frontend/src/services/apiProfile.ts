import { authFetch } from "../state/AuthFetch";

export type PronounsOption = "she/her" | "he/him" | "they/them" | "prefer not to say";

export type BuddyPreferences = {
    gender?: string | null;
    age?: number | null;       // legacy (may exist)
    ageMin?: number | null;
    ageMax?: number | null;
    minGreen?: number | null;
};


export type MyProfile = {
    userid: number;
    username: string;
    nicknames: string;
    dailyMood: string;
    dateOfBirth: string | null;
    theme: "light" | "dark" | "colourblind";
    pronouns: string;
    dobHidden: 0 | 1;
    instantBuddy: 0 | 1;
    hasProfilePic: boolean;
    profilePicUrl: string | null;
    preferences: BuddyPreferences | null;
    moodHistory: string[];
};

export type ContactPublicProfile = {
    userid: number;
    nicknames: string;
    dailyMood: string;
    dateOfBirth: string | null;
    dobHidden: number | 0 | 1;
    pronouns: string;
    hasProfilePic: boolean;
    profilePicUrl: string | null;
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
    const profile = body.data as MyProfile;

    // Load preferences separately (profile endpoint does not include them)
    try {
        const prefRes = await authFetch(`/api/preferences/${profile.userid}`);
        if (prefRes.ok) {
            const prefBody = await prefRes.json();
            profile.preferences = prefBody.data as BuddyPreferences;
        } else {
            profile.preferences = null;
        }
    } catch {
        profile.preferences = null;
    }

    return profile;
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

export async function apiGetContactProfile(userId: number): Promise<ContactPublicProfile> {
    const res = await authFetch(`/api/contacts/${userId}`);
    if (!res.ok) throw new Error("Failed to load contact profile");
    const body = await res.json();
    return body.data as ContactPublicProfile;
}

export async function apiGetContactMoodHistory(userId: number): Promise<MoodHistoryRow[]> {
    const res = await authFetch(`/api/contacts/${userId}/moodhistory`);
    if (!res.ok) throw new Error("Failed to load contact mood history");
    const body = await res.json();
    return body.data as MoodHistoryRow[];
}

export type BuddyPreferencesUpdate = {
    gender: "male" | "female" | "other" | "hidden" | null;
    minGreen: number | null;
    ageMin: number | null;
    ageMax: number | null;
};

export async function apiUpsertMyPreferences(userId: number, prefs: BuddyPreferencesUpdate): Promise<void> {
    // If preferences exist, PUT; else POST /new
    // Backend does not require auth, but authFetch is fine here.
    const putRes = await authFetch(`/api/preferences/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
    });

    if (putRes.ok) return;

    // If update fails (e.g. row missing), try create
    const postRes = await authFetch(`/api/preferences/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...prefs }),
    });

    if (!postRes.ok) {
        const body = await postRes.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save preferences");
    }
}

export async function apiDeleteMyAccount(password: string): Promise<void> {
    const res = await authFetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete account");
    }
}
