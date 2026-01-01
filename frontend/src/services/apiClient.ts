import {encryptTextBase64, encryptPasswordBase64 } from "./crypto";

export type LoginResponse = {
    token: string;
    userId: number;
};

export async function apiLogin(username: string, password: string): Promise<LoginResponse> {
    const passwordEnc = await encryptPasswordBase64(password);

    // debug (remove later)
    console.log("passwordEnc type/value preview:", typeof passwordEnc, passwordEnc.slice(0, 20));

    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, passwordEnc }),
    });

    if (!res.ok) {
        let msg = "Login failed.";
        try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) msg = data.error;
        } catch { /* empty */ }
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
    // Encrypt personal data
    const emailEnc = await encryptTextBase64(input.email.trim());
    const passwordEnc = await encryptPasswordBase64(input.password);
    const nicknameEnc = await encryptTextBase64(input.nickname.trim());

    const dobEnc =
        input.dateOfBirth && input.dateOfBirth.trim()
            ? await encryptTextBase64(input.dateOfBirth.trim())
            : null;

    const pronounsEnc =
        input.pronouns && input.pronouns.trim()
            ? await encryptTextBase64(input.pronouns.trim())
            : null;

    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            emailEnc,
            passwordEnc,
            nicknameEnc,
            dateOfBirthEnc: dobEnc,
            pronounsEnc,
        }),
    });

    if (!res.ok) {
        let msg = "Registration failed.";
        try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) msg = data.error;
        } catch { /* empty */ }
        throw new Error(msg);
    }
}