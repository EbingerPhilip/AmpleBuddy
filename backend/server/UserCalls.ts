import type { Express } from "express";
import jwt from "jsonwebtoken";

// Must match system.ts (move to .env later)
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

type ChatMember = {
    userId: number;
    username: string;  // email
    nickname: string;
};

type ChatMessage = {
    messageId: number;
    senderId: number;
    content: string;
    sentAtIso: string; // ISO timestamp for easy sorting/display
};

type Chat = {
    chatId: number;
    members: ChatMember[];
    lastMessage: ChatMessage | null;
};

// Temporary in-memory chat data (compatible with later SQL joins)
const TEMP_CHATS: Chat[] = [
    {
        chatId: 101,
        members: [
            { userId: 3, username: "buddy@example.com", nickname: "buddy" },
            { userId: 2, username: "max.musterman@gmail.com", nickname: "Mr. Musterman" },
        ],
        lastMessage: {
            messageId: 5001,
            senderId: 2,
            content: "I really like puzzles.",
            sentAtIso: new Date().toISOString(),
        },
    },
    {
        chatId: 102,
        members: [
            { userId: 3, username: "buddy@example.com", nickname: "buddy" },
            { userId: 9999, username: "philip@example.com", nickname: "Philip" },
        ],
        lastMessage: {
            messageId: 5002,
            senderId: 9999,
            content: "Stop stealing my stuff",
            sentAtIso: new Date().toISOString(),
        },
    },
    {
        chatId: 103,
        members: [
            { userId: 3, username: "buddy@example.com", nickname: "buddy" },
            { userId: 4, username: "martin@example.com", nickname: "Martin" },
        ],
        lastMessage: {
            messageId: 5002,
            senderId: 4,
            content: "Please help me fight Gloria off",
            sentAtIso: new Date().toISOString(),
        },
    },
    {
        chatId: 104,
        members: [
            { userId: 3, username: "buddy@example.com", nickname: "buddy" },
            { userId: 5, username: "gloria@example.com", nickname: "Gloria" },
        ],
        lastMessage: {
            messageId: 5002,
            senderId: 5,
            content: "You can run but you can't hide",
            sentAtIso: new Date().toISOString(),
        },
    },
    {
        chatId: 105,
        members: [
            { userId: 3, username: "buddy@example.com", nickname: "buddy" },
            { userId: 6, username: "abdullah@example.com", nickname: "Abdullah" },
        ],
        lastMessage: null
    },
];

function getUserIdFromAuthHeader(authHeader: unknown): number | null {
    if (typeof authHeader !== "string") return null;
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return null;

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { sub?: string };
        const id = Number(payload.sub);
        return Number.isFinite(id) ? id : null;
    } catch {
        return null;
    }
}

export function registerUserRoutes(app: Express) {
    // GET current user's chats
    app.get("/api/user/chats", (req, res) => {
        const userId = getUserIdFromAuthHeader(req.headers.authorization);
        if (!userId) return res.status(401).json({ error: "Unauthorised" });

        const userChats = TEMP_CHATS.filter((c) => c.members.some((m) => m.userId === userId));

        return res.status(200).json({
            userId,
            chats: userChats,
        });
    });
}
