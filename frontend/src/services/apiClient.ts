export type LoginResponse = {
    token: string;
    userId: number;
};

export async function apiLogin(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch("/api/user/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username, password}),
    });

    if (!res.ok) {
        let msg = "Login failed.";
        try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) msg = data.error;
        } catch { /* empty */
        }
        throw new Error(msg);
    }

    return (await res.json()) as LoginResponse;
}

export type RegisterInput = {
    email: string;
    password: string;
    nickname: string;
    dateOfBirth?: string; // YYYY-MM-DD
    pronouns?: "she/her" | "he/him" | "they/them" | "prefer not to say";
};

export async function apiRegister(input: RegisterInput): Promise<void> {
    const res = await fetch("/api/user/new", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            username: input.email,          // email = username
            password: input.password,
            nicknames: input.nickname,      // backend field name is nicknames (string)
            dateOfBirth: input.dateOfBirth ?? null,
            pronouns: input.pronouns ?? null,
            // dailyMood/theme/instantBuddy not provided by the UI, ergo backend should handle defaults
        }),
    });

    if (!res.ok) {
        let msg = "Registration failed.";
        try {
            const data = (await res.json()) as { error?: string };
            console.log(data);
            if (data?.error) msg = data.error;
        } catch { /* empty */
        }
        throw new Error(msg);
    }
}
