import {Request, Response, NextFunction} from "express";
import {verifyUserToken} from "./jwt";

export type AuthedRequest = Request & { userId: number };

function extractBearerToken(req: Request): string | null {
    const header = req.header("authorization") ?? req.header("Authorization");
    if (!header) return null;

    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match || !match[1]) return null;
    return match[1].trim();

}

/**
 * Requires a valid JWT in Authorization: Bearer <token>
 * Attaches req.userId (number).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const token = extractBearerToken(req);
        if (!token) {
            return res.status(401).json({error: "Missing Authorization Bearer token"});
        }

        const {userId} = verifyUserToken(token);
        (req as AuthedRequest).userId = userId;

        next();
    } catch {
        return res.status(401).json({error: "Invalid or expired token"});
    }
}
