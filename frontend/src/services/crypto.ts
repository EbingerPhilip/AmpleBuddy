// src/services/crypto.ts

let cachedPublicKey: CryptoKey | null = null;

function pemToDer(pem: string): ArrayBuffer {
    const b64 = pem
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replace(/\s+/g, "");

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

async function importServerPublicKey(pem: string): Promise<CryptoKey> {
    const der = pemToDer(pem);

    return crypto.subtle.importKey(
        "spki",
        der,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
    );
}

async function fetchServerPublicKeyPem(): Promise<string> {
    const res = await fetch("/api/auth/public-key");
    if (!res.ok) throw new Error(`Public key fetch failed (${res.status})`);

    const data = (await res.json()) as { publicKeyPem?: unknown };
    if (typeof data.publicKeyPem !== "string") {
        throw new Error("Server returned invalid public key data.");
    }
    return data.publicKeyPem;
}

async function getPublicKey(): Promise<CryptoKey> {
    if (cachedPublicKey) return cachedPublicKey;

    if (!globalThis.crypto?.subtle) {
        // This happens if you are not in a secure context (not localhost/https) or a very old browser.
        throw new Error("Web Crypto API not available. Use https or localhost.");
    }

    const pem = await fetchServerPublicKeyPem();
    cachedPublicKey = await importServerPublicKey(pem);
    return cachedPublicKey;
}

export async function encryptTextBase64(text: string): Promise<string> {
    const key = await getPublicKey();
    const encoded = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, encoded);
    return arrayBufferToBase64(encrypted);
}

// Keep compatibility with your existing login code
export async function encryptPasswordBase64(password: string): Promise<string> {
    return encryptTextBase64(password);
}