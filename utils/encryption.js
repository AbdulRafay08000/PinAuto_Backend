import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const ALGORITHM = 'aes-256-cbc';
// Ensure key is 32 bytes. If env var is shorter/longer, adjust or hash it.
// For simplicity in this demo, accessing process.env.ENCRYPTION_KEY directly.
// In production, ensure ENCRYPTION_KEY is exactly 32 chars or use a hash of it.

const getKey = () => {
    const key = process.env.ENCRYPTION_KEY || 'default_secret_key_32_chars_long!!';
    // Pad or truncate to 32 bytes if necessary
    return crypto.scryptSync(key, 'salt', 32);
};

export const encryptPassword = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decryptPassword = (text) => {
    if (!text) return null;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};
