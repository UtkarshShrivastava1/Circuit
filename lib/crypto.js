import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// Derive encryption key from secret and salt
function deriveKey(secret, salt) {
  return scryptSync(secret, salt, KEY_LENGTH);
}

// Encrypt data
export async function encrypt(text, secret) {
  try {
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);
    
    // Derive key using salt
    const key = deriveKey(secret, salt);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV, salt, tag and encrypted data
    const combined = Buffer.concat([
      iv,
      salt,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt data
export async function decrypt(encrypted, secret) {
  try {
    const combined = Buffer.from(encrypted, 'base64');
    
    // Extract the parts
    const iv = combined.slice(0, IV_LENGTH);
    const salt = combined.slice(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
    const tag = combined.slice(IV_LENGTH + SALT_LENGTH, IV_LENGTH + SALT_LENGTH + TAG_LENGTH);
    const text = combined.slice(IV_LENGTH + SALT_LENGTH + TAG_LENGTH);
    
    // Derive key using extracted salt
    const key = deriveKey(secret, salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}