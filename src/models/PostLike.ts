import { query } from '../database/connection';
import type { User } from './User';
import type { Post } from './Post';

export interface PostLike {
  id: number;
  user_id: number;
  post_id: number;
}

export class PostLikeModel {
  async create(userId: number, postId: number): Promise<PostLike | null> {
    try {
      const result = await query(
        'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)',
        [userId, postId]
      ) as any;

      if (result.insertId) {
        return this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error('Error creating post like:', error);
      return null;
    }
  }

  async delete(userId: number, postId: number): Promise<boolean> {
    try {
      const result = await query(
        'DELETE FROM post_likes WHERE user_id = ? AND post_id = ?',
        [userId, postId]
      ) as any;

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting post like:', error);
      return false;
    }
  }

  async findById(id: number): Promise<PostLike | null> {
    try {
      const likes = await query(
        'SELECT * FROM post_likes WHERE id = ?',
        [id]
      ) as PostLike[];

      return likes[0] || null;
    } catch (error) {
      console.error('Error finding post like:', error);
      return null;
    }
  }

  async getLikesForPost(postId: number): Promise<User[]> {
    try {
      return await query(
        'SELECT u.* FROM users u JOIN post_likes l ON u.id = l.user_id WHERE l.post_id = ?',
        [postId]
      ) as User[];
    } catch (error) {
      console.error('Error getting likes for post:', error);
      return [];
    }
  }

  async getLikedPostsByUser(userId: number): Promise<Post[]> {
    try {
      return await query(
        'SELECT p.* FROM posts p JOIN post_likes l ON p.id = l.post_id WHERE l.user_id = ?',
        [userId]
      ) as Post[];
    } catch (error) {
      console.error('Error getting liked posts:', error);
      return [];
    }
  }

  static async initTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS post_likes (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          post_id INT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          UNIQUE KEY unique_like (user_id, post_id)
        )
      `);
    } catch (error) {
      console.error('Error initializing post_likes table:', error);
      throw error;
    }
  }
} 