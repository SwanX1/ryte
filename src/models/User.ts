import { query } from '../database/connection';
import { hashPassword, verifyPassword } from '../util/crypto';

export interface User {
  id: number;
  username: string;
  password: string;
  created_at: string;
}

export class UserModel {
  async create(username: string, password: string): Promise<User | null> {
    try {
      const hashedPassword = await hashPassword(password);
      const result = await query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword]
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

  async findByUsername(username: string): Promise<User | null> {
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

  async findById(id: number): Promise<User | null> {
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

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return verifyPassword(password, user.password);
  }

  async initTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      console.error('Error initializing users table:', error);
      throw error;
    }
  }
} 