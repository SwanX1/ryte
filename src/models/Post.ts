import { query } from '../database/connection';
import { hashPassword, verifyPassword } from '../util/crypto';

export type PostType = 'text' | 'images' | 'video';

export interface Post {
  id: number;
  user: number;
  content: string;
  type: PostType;
  created_at: number;
  updated_at: number;
}

export class PostModel {
  static async create(type: PostType, content: string, user: number): Promise<Post | null> {
    try {
      const date = Date.now();
      const result = await query(
        'INSERT INTO posts (type, content, user, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [type, content, user, date, date]
      ) as any;
      if (result.insertId) {
        const post = await this.findById(result.insertId);
        return post;
      }
      return null;
    } catch (error) {
      console.error('Error creating post:', error);
      return null;
    }
  }

  static async listByUser(id: number): Promise<Post[]> {
    try {
      return await query(
        'SELECT * FROM posts WHERE user = ?',
        [id]
      ) as Post[] || [];
    } catch (error) {
      console.error('Error listing posts:', error);
      return [];
    }
  }

  static async findById(id: number): Promise<Post | null> {
    try {
      const posts = await query(
        'SELECT * FROM posts WHERE id = ?',
        [id]
      ) as Post[];

      return posts[0] || null;
    } catch (error) {
      console.error('Error finding post:', error);
      return null;
    }
  }

  static async searchByContent(partial: string): Promise<Post[]> {
    try {
      const posts = await query(
        'SELECT * FROM posts WHERE content LIKE ? COLLATE utf8mb4_general_ci',
        [`%${partial}%`]
      ) as Post[];
      return posts;
    } catch (error) {
      console.error('Error searching posts by content:', error);
      return [];
    }
  }

  static async initTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user INT NOT NULL,
          content TEXT NOT NULL,
          type ENUM('text', 'images', 'video') NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          FOREIGN KEY (user) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    } catch (error) {
      console.error('Error initializing users table:', error);
      throw error;
    }
  }

  static async delete(id: number): Promise<boolean> {
    try {
      const result = await query(
        'DELETE FROM posts WHERE id = ?',
        [id]
      ) as any;

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  static async update(id: number, content: string): Promise<Post | null> {
    try {
      const date = Date.now();
      const result = await query(
        'UPDATE posts SET content = ?, updated_at = ? WHERE id = ?',
        [content, date, id]
      ) as any;
      
      if (result.affectedRows > 0) {
        return await this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating post:', error);
      return null;
    }
  }

  static async listByUsers(userIds: number[]): Promise<Post[]> {
    if (!userIds.length) return [];
    const placeholders = userIds.map(() => '?').join(',');
    try {
      return await query(
        `SELECT * FROM posts WHERE user IN (${placeholders}) ORDER BY created_at DESC`,
        userIds
      ) as Post[] || [];
    } catch (error) {
      console.error('Error listing posts by users:', error);
      return [];
    }
  }
} 