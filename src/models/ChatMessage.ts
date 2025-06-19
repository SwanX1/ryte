import { query } from '../database/connection';

export interface ChatMessage {
  id: number;
  chat_id: number;
  is_user_a: boolean;
  message: string;
  created_at: Date;
}

export class ChatMessageModel {
  static async create(chatId: number, isUserA: boolean, message: string): Promise<ChatMessage | null> {
    try {
      const result = await query(
        'INSERT INTO chat_messages (chat_id, is_user_a, message) VALUES (?, ?, ?)',
        [chatId, isUserA, message]
      ) as any;
      return {
        id: result.insertId,
        chat_id: chatId,
        is_user_a: isUserA,
        message,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Error creating chat message:', error);
      return null;
    }
  }

  static async listByChat(chatId: number): Promise<ChatMessage[]> {
    try {
      const messages = await query(
        'SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC',
        [chatId]
      ) as ChatMessage[];
      return messages;
    } catch (error) {
      console.error('Error listing chat messages:', error);
      return [];
    }
  }

  static async initTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          chat_id INT NOT NULL,
          is_user_a BOOLEAN NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE
        )
      `);
    } catch (error) {
      console.error('Error initializing chat_messages table:', error);
      throw error;
    }
  }
} 