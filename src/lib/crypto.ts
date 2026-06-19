import CryptoJS from "crypto-js";

const E2EE_PREFIX = "__e2ee__:";

/**
 * Encrypts a message using AES-256 if a secret key is provided.
 */
export function encryptMessage(content: string, secret: string): string {
  if (!secret || !content.trim()) return content;
  
  try {
    const ciphertext = CryptoJS.AES.encrypt(content, secret).toString();
    return `${E2EE_PREFIX}${ciphertext}`;
  } catch (err) {
    console.error("Encryption failed:", err);
    return content;
  }
}

/**
 * Decrypts a message using AES-256 if it has the E2EE prefix and a secret is provided.
 * Returns the decrypted string if successful, the original ciphertext if no secret is provided,
 * or null if decryption fails (e.g. incorrect password).
 */
export function decryptMessage(content: string, secret: string): string | null {
  if (!content.startsWith(E2EE_PREFIX)) {
    return content; // Plain text message
  }

  const ciphertext = content.slice(E2EE_PREFIX.length);

  if (!secret) {
    return content; // Returns the raw encrypted string since no password is configured yet
  }

  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (decrypted) {
      return decrypted;
    }
    return null; // Decryption produced empty output (incorrect password)
  } catch (err) {
    return null; // Decryption threw error (incorrect password/corrupt)
  }
}
