import jwt, { JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set. Add it to backend/.env pls");
}

// 2 hours
const TOKEN_EXPIRES_IN = "2h";

export type AuthTokenPayload = {
    userId: number;
};

/**
 * Signs a JWT for a user. We store the userId in the standard "sub" (subject) claim.
 */
export function signUserToken(userId: number): string {
    if (!Number.isInteger(userId) || userId <= 0) {
        throw new Error("signUserToken: userId must be a positive integer");
    }

    return jwt.sign(
        {},
        JWT_SECRET,
        {
            expiresIn: TOKEN_EXPIRES_IN,
            subject: String(userId),
        }
    );
}

/**
 * Verifies a JWT and returns the payload { userId }.
 * Throws if invalid/expired.
 */
export function verifyUserToken(token: string): AuthTokenPayload {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const sub = decoded.sub;
    const userId = typeof sub === "string" ? Number(sub) : NaN;

    if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error("Invalid token subject (sub): expected a positive userId");
    }

    return { userId };
}
