import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import  argon2  from "argon2";

const encryptkey = process.env.Encryption_Key;
if (!encryptkey) {
  throw new Error("Missing environment variable: Encryption_Key");
}
const KEY = Buffer.from(
  encryptkey,
  "hex"
);

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function encrypt(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Layout: [iv | ciphertext | authTag]
  return Buffer.concat([iv, encrypted, authTag]).toString("base64");
}

/**
 * Decrypt Base64 text → UTF-8 / utf8mb4 text
 */
export function decrypt(cipherText: string): string {
  const data = Buffer.from(cipherText, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}
