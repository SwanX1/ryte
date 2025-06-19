import { query } from '../database/connection';
import { ChatMessageModel } from './ChatMessage';

export interface Chat {
  chat_id: number;
  user_a: number;
  user_b: number;
}

export class ChatModel {
  static async create(userA: number, userB: number): Promise<Chat | null> {
    try {
      const result = await query(
        'INSERT INTO chats (user_a, user_b) VALUES (?, ?)',
        [userA, userB]
      ) as any;
      return { chat_id: result.insertId, user_a: userA, user_b: userB };
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }

  static async findByUsers(userA: number, userB: number): Promise<Chat | null> {
    try {
      const chats = await query(
        'SELECT * FROM chats WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)',
        [userA, userB, userB, userA]
      ) as Chat[];
      return chats[0] || null;
    } catch (error) {
      console.error('Error finding chat:', error);
      return null;
    }
  }

  static async findById(chatId: number): Promise<Chat | null> {
    try {
      const chats = await query(
        'SELECT * FROM chats WHERE chat_id = ?',
        [chatId]
      ) as Chat[];
      return chats[0] || null;
    } catch (error) {
      console.error('Error finding chat by id:', error);
      return null;
    }
  }

  static async initTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS chats (
          chat_id INT AUTO_INCREMENT PRIMARY KEY,
          user_a INT NOT NULL,
          user_b INT NOT NULL,
          FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    } catch (error) {
      console.error('Error initializing chats table:', error);
      throw error;
    }
  }
}