export type AuthSession = {
    token: string;
    userId: number;
    expiresAt: number; // epoch ms
};

const KEY = "amplebuddy_session";

export function saveSession(session: AuthSession) {
    localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    try {
        const session = JSON.parse(raw) as AuthSession;
        if (!session?.token || !session.expiresAt) return null;
        if (Date.now() > session.expiresAt) {
            clearSession();
            return null;
        }
        return session;
    } catch {
        clearSession();
        return null;
    }
}

export function clearSession() {
    localStorage.removeItem(KEY);
}
