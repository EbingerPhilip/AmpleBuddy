import { loadSession } from "./AuthStorage";

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
    const session = loadSession();
    const headers = new Headers(init.headers);

    if (session?.token) {
        headers.set("Authorization", `Bearer ${session.token}`);
    }

    return fetch(input, { ...init, headers });
}
