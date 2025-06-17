import { query } from '../database/connection';
import type { User } from './User';
import type { Post } from './Post';

export interface PostComment {
  id: number;
  user_id: number;
  post_id: number;
  content: string;
  created_at: string;
}

export class PostCommentModel {
  async create(userId: number, postId: number, content: string): Promise<PostComment | null> {
    try {
      const result = await query(
        'INSERT INTO post_comments (user_id, post_id, content) VALUES (?, ?, ?)',
        [userId, postId, content]
      ) as any;

      if (result.insertId) {
        return this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error creating post comment:', error);
      return null;
    }
  }

  async update(id: number, content: string): Promise<PostComment | null> {
    try {
      await query(
        'UPDATE post_comments SET content = ? WHERE id = ?',
        [content, id]
      );
      return this.findById(id);
    } catch (error) {
      console.error('Error updating post comment:', error);
      return null;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const result = await query(
        'DELETE FROM post_comments WHERE id = ?',
        [id]
      ) as any;

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting post comment:', error);
      return false;
    }
  }

  async findById(id: number): Promise<PostComment | null> {
    try {
      const comments = await query(
        'SELECT * FROM post_comments WHERE id = ?',
        [id]
      ) as PostComment[];

      return comments[0] || null;
    } catch (error) {
      console.error('Error finding post comment:', error);
      return null;
    }
  }

  async getCommentsForPost(postId: number): Promise<(PostComment & { user: User })[]> {
    try {
      return await query(
        `SELECT c.*, u.* 
         FROM post_comments c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.post_id = ? 
         ORDER BY c.created_at DESC`,
        [postId]
      ) as (PostComment & { user: User })[];
    } catch (error) {
      console.error('Error getting comments for post:', error);
      return [];
    }
  }

  async getCommentsByUser(userId: number): Promise<(PostComment & { post: Post })[]> {
    try {
      return await query(
        `SELECT c.*, p.* 
         FROM post_comments c 
         JOIN posts p ON c.post_id = p.id 
         WHERE c.user_id = ? 
         ORDER BY c.created_at DESC`,
        [userId]
      ) as (PostComment & { post: Post })[];
    } catch (error) {
      console.error('Error getting comments by user:', error);
      return [];
    }
  }

  static async initTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          post_id INT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
        )
      `);
    } catch (error) {
      console.error('Error initializing post_comments table:', error);
      throw error;
    }
  }
} 