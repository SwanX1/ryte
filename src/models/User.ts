import { query } from '../database/connection';
import { hashPassword, verifyPassword } from '../util/crypto';

export type UserRole = 'registered' | 'moderator' | 'administrator';

export const FALLBACK_AVATAR = "/assets/default_avatar.png";

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  email_verified: boolean;
  verification_code: string | null;
  avatar_url: string;
  created_at: string;
}

export class UserModel {
  static async create(
    username: string, 
    email: string, 
    password: string, 
    role: UserRole = 'registered',
    avatarUrl: string = FALLBACK_AVATAR
  ): Promise<User | null> {
    try {
      const hashedPassword = await hashPassword(password);
      const verificationCode = Math.random().toString(36).substring(2, 15);
      const result = await query(
        'INSERT INTO users (username, email, password, role, email_verified, verification_code, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, email, hashedPassword, role, false, verificationCode, avatarUrl]
      ) as any;

      if (result.insertId) {
        return this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  static async artificialVerifyEmail(userId: number): Promise<boolean> {
    try {
      const result = await query(
        'UPDATE users SET email_verified = true, verification_code = NULL WHERE id = ?',
        [userId]
      ) as any;
  }

  static async verifyEmail(userId: number, code: string): Promise<boolean> {
    try {
      const result = await query(
        'UPDATE users SET email_verified = true, verification_code = NULL WHERE id = ? AND verification_code = ?',
        [userId, code]
      ) as any;
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const users = await query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      ) as User[];

      return users[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  static async findByUsername(username: string): Promise<User | null> {
    try {
      const users = await query(
        'SELECT * FROM users WHERE username = ?',
        [username]
      ) as User[];

      return users[0] || null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }

  static async findById(id: number): Promise<User | null> {
    try {
      const users = await query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      ) as User[];

      return users[0] || null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return verifyPassword(password, user.password);
  }

  static async searchByUsername(partial: string): Promise<User[]> {
    try {
      const users = await query(
        'SELECT * FROM users WHERE username LIKE ? COLLATE utf8mb4_general_ci',
        [`%${partial}%`]
      ) as User[];
      return users;
    } catch (error) {
      console.error('Error searching users by username:', error);
      return [];
    }
  }

  static async initTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('registered', 'moderator', 'administrator') NOT NULL DEFAULT 'registered',
          email_verified BOOLEAN NOT NULL DEFAULT FALSE,
          verification_code VARCHAR(255),
          avatar_url VARCHAR(255) NOT NULL DEFAULT '${FALLBACK_AVATAR}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      console.error('Error initializing users table:', error);
      throw error;
    }
  }
} 