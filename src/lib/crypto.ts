import CryptoJS from 'crypto-js';

/**
 * Encrypts a string using a key.
 * @param text The plain text to encrypt.
 * @param key The secret key for encryption.
 * @returns The encrypted string (Base64).
 */
export const encrypt = (text: string, key: string): string => {
  if (!text) return '';
  try {
    return CryptoJS.AES.encrypt(text, key).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Fallback to plain text if encryption fails
  }
};

/**
 * Decrypts an encrypted string using a key.
 * @param ciphertext The encrypted string (Base64).
 * @param key The secret key for decryption.
 * @returns The decrypted plain text.
 */
export const decrypt = (ciphertext: string, key: string): string => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    if (!originalText) return ciphertext; // Return original if decryption fails (e.g. not encrypted)
    return originalText;
  } catch (error) {
    // If decryption fails, it might be plain text or wrong key
    return ciphertext;
  }
};

/**
 * Generates a consistent key based on user UID.
 * In a real production app, this would be more complex or use a user-provided password.
 */
export const getEncryptionKey = (uid: string): string => {
  return CryptoJS.SHA256(uid + 'blaze-ai-salt-2026').toString();
};
