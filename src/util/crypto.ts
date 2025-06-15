import { pbkdf2 as pbkdf2Sync, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2 = promisify(pbkdf2Sync);

export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = randomBytes(16).toString('hex');
  
  // Create a hash using PBKDF2
  const hash = (await pbkdf2(password, salt, 100000, 64, 'sha512')).toString('hex');

  // Return salt and hash concatenated with a separator
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Split the stored password into salt and hash
  const [salt, storedHash] = hashedPassword.split(':');
  
  if (!salt || !storedHash) {
    return false;
  }

  const hash = (await pbkdf2(password, salt, 100000, 64, 'sha512')).toString('hex');

  return hash === storedHash;
}

