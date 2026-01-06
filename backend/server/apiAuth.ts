import type { Express } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// PLACEHOLDER, move later into ..env file !
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

// *************************************** PLACE HOLDER USERS ***************************************

type PlaceholderUser = {
    userId: number;
    username: string;
    passwordPlain: string; // PLACEHOLDER, change later !
};
// Placeholder users stored in this file as requested
const PLACEHOLDER_USERS: PlaceholderUser[] = [
    { userId: 2, username: "max.musterman@gmail.com", passwordPlain: "amplepasswd" },
    { userId: 3, username: "buddy@example.com", passwordPlain: "test1234" },
];

type RegisteredUser = {
    userId: number;
    email: string;
    passwordPlain: string;
    nickname: string;
    dateOfBirth?: string;
    pronouns?: string;
};

const REGISTERED_USERS: RegisteredUser[] = [];
let NEXT_USER_ID = 1000;

// *************************************** HELPER FUNCTIONS ***************************************

// RSA keys for encrypt/decrypt (placeholder: generated at runtime)
// In production: load from secure storage
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
});

// Export the public key in SPKI PEM format (works with WebCrypto import)
const PUBLIC_KEY_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();

function decryptRsaBase64(encB64: string): string {
    const encryptedBytes = Buffer.from(encB64, "base64");

    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        encryptedBytes
    );

    return decrypted.toString("utf-8");
}

// *************************************** API END POINTS ***************************************

export function registerSystemRoutes(app: Express) {
    app.get("/api/auth/public-key", (_req, res) => {
        res.status(200).json({ publicKeyPem: PUBLIC_KEY_PEM });
    });

    // Login
    app.post("/api/auth/login", (req, res) => {
        const { username, passwordEnc } = req.body ?? {};
        console.log("Body received:", req.body);

        if (typeof username !== "string" || typeof passwordEnc !== "string") {
            console.log("Bad Request")
            console.log(username, passwordEnc);
            return res.status(400).json({
                error: `Bad request. Got keys: ${Object.keys(req.body ?? {}).join(", ")}`,
            });
        }

        let passwordPlain: string;
        try {
            passwordPlain = decryptRsaBase64(passwordEnc);
        } catch {
            console.log("Invalid encrypted password");
            return res.status(400).json({ error: "Invalid encrypted password" });
        }

        const usernameNorm = username.trim().toLowerCase();

        const user =
            PLACEHOLDER_USERS.find((u) => u.username.toLowerCase() === usernameNorm) ??
            REGISTERED_USERS.find((u) => u.email.toLowerCase() === usernameNorm);

        if (!user || user.passwordPlain !== passwordPlain) {
            console.log("Invalid credentials");
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { sub: String(user.userId) },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        return res.status(200).json({ userId: user.userId, token });
    });

    // Register
    app.post("/api/auth/register", (req, res) => {
        const { emailEnc, passwordEnc, nicknameEnc, dateOfBirthEnc, pronounsEnc } = req.body ?? {};
        console.log("Register body received:", req.body);

        if (
            typeof emailEnc !== "string" ||
            typeof passwordEnc !== "string" ||
            typeof nicknameEnc !== "string" ||
            !(
                typeof dateOfBirthEnc === "undefined" ||
                dateOfBirthEnc === null ||
                typeof dateOfBirthEnc === "string"
            ) ||
            !(
                typeof pronounsEnc === "undefined" ||
                pronounsEnc === null ||
                typeof pronounsEnc === "string"
            )
        ) {
            return res.status(400).json({
                error: `Bad request. Expected encrypted fields. Got keys: ${Object.keys(req.body ?? {}).join(", ")}`,
            });
        }

        let emailPlain: string;
        let passwordPlain: string;
        let nicknamePlain: string;
        let dobPlain: string | undefined;
        let pronounsPlain: string | undefined;

        try {
            emailPlain = decryptRsaBase64(emailEnc);
            passwordPlain = decryptRsaBase64(passwordEnc);
            nicknamePlain = decryptRsaBase64(nicknameEnc);

            if (typeof dateOfBirthEnc === "string") dobPlain = decryptRsaBase64(dateOfBirthEnc);
            if (typeof pronounsEnc === "string") pronounsPlain = decryptRsaBase64(pronounsEnc);
        } catch {
            return res.status(400).json({ error: "Invalid encrypted payload" });
        }

        const allowedPronouns = new Set(["she/her", "he/him", "they/them", "prefer not to say"]);
        if (pronounsPlain !== undefined && !allowedPronouns.has(pronounsPlain)) {
            return res.status(400).json({ error: "Invalid pronouns value." });
        }


        const emailNorm = emailPlain.trim().toLowerCase();
        const nicknameNorm = nicknamePlain.trim();

        // Minimal validation (frontend also validates, but backend must too)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
            return res.status(400).json({ error: "Invalid e-mail." });
        }
        if (passwordPlain.length < 6) {
            return res.status(400).json({ error: "Password too short." });
        }
        if (!nicknameNorm) {
            return res.status(400).json({ error: "Nickname required." });
        }

        // Email uniqueness check
        const usedInPlaceholders = PLACEHOLDER_USERS.some(
            (u) => u.username.trim().toLowerCase() === emailNorm
        );
        const usedInRegistered = REGISTERED_USERS.some(
            (u) => u.email.trim().toLowerCase() === emailNorm
        );
        if (usedInPlaceholders || usedInRegistered) {
            return res.status(409).json({ error: "E-mail is already in use." });
        }

        const newUser: RegisteredUser = {
            userId: NEXT_USER_ID++,
            email: emailNorm,
            passwordPlain,
            nickname: nicknameNorm,
        };
        if (dobPlain !== undefined) {
            newUser.dateOfBirth = dobPlain;
        }
        if (pronounsPlain !== undefined) {
            newUser.pronouns = pronounsPlain;
        }


        // THIS ONLY MAKES NEW USERS EXIST AS LONG AS THE SERVER IS RUNNING, REPLACE WITH MYSQL LATER
        REGISTERED_USERS.push(newUser);

        return res.status(201).json({ ok: true });
    });

}
