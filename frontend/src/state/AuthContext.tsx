import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, loadSession, saveSession, type AuthSession } from "./AuthStorage";
import { apiLogin } from "../services/apiClient";
import { apiGetMyProfile } from "../services/apiProfile";

type AuthContextValue = {
    isAuthenticated: boolean;
    userId: number | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Theme = "light" | "dark" | "colourblind";

function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<AuthSession | null>(() => loadSession());

    // Auto-logout when expired (best-effort)
    useEffect(() => {
        if (!session) return;
        const msLeft = session.expiresAt - Date.now();
        if (msLeft <= 0) {
            clearSession();
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSession(null);
            return;
        }
        const timer = window.setTimeout(() => {
            clearSession();
            setSession(null);
        }, msLeft);
        return () => window.clearTimeout(timer);
    }, [session]);

    useEffect(() => {
        if (!session) {
            // when logged out, reset to light
            applyTheme("light");
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const me = await apiGetMyProfile();
                if (!cancelled) applyTheme(me.theme);
            } catch {
                // if profile fetch fails, keep current theme (or fallback to light)
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [session]);

    async function login(username: string, password: string) {
        const res = await apiLogin(username, password);

        const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
        const newSession: AuthSession = {
            token: res.token,
            userId: res.userId,
            expiresAt,
        };
        saveSession(newSession);
        setSession(newSession);
    }

    function logout() {
        clearSession();
        setSession(null);
    }

    const value = useMemo<AuthContextValue>(
        () => ({
            isAuthenticated: !!session,
            userId: session?.userId ?? null,
            token: session?.token ?? null,
            login,
            logout,
        }),
        [session]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
