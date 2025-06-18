import { query } from '../database/connection';
import type { User } from './User';

export interface UserFollow {
  follower_id: number;
  following_id: number;
}

export class UserFollowModel {
  static async create(followerId: number, followingId: number): Promise<UserFollow | null> {
    try {
      await query(
        'INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)',
        [followerId, followingId]
      );
      return { follower_id: followerId, following_id: followingId };
    } catch (error) {
      console.error('Error creating user follow:', error);
      return null;
    }
  }

  static async delete(followerId: number, followingId: number): Promise<boolean> {
    try {
      const result = await query(
        'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
        [followerId, followingId]
      ) as any;

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting user follow:', error);
      return false;
    }
  }

  static async find(followerId: number, followingId: number): Promise<UserFollow | null> {
    try {
      const follows = await query(
        'SELECT * FROM user_follows WHERE follower_id = ? AND following_id = ?',
        [followerId, followingId]
      ) as UserFollow[];

      return follows[0] || null;
    } catch (error) {
      console.error('Error finding user follow:', error);
      return null;
    }
  }

  static async getFollowerIds(userId: number): Promise<number[]> {
    try {
      const results = await query(
        'SELECT follower_id FROM user_follows WHERE following_id = ?',
        [userId]
      ) as { follower_id: number }[];
      
      return results.map(r => r.follower_id);
    } catch (error) {
      console.error('Error getting follower IDs:', error);
      return [];
    }
  }

  static async getFollowingIds(userId: number): Promise<number[]> {
    try {
      const results = await query(
        'SELECT following_id FROM user_follows WHERE follower_id = ?',
        [userId]
      ) as { following_id: number }[];
      
      return results.map(r => r.following_id);
    } catch (error) {
      console.error('Error getting following IDs:', error);
      return [];
    }
  }

  static async initTable(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS user_follows (
          follower_id INT NOT NULL,
          following_id INT NOT NULL,
          PRIMARY KEY (follower_id, following_id),
          FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    } catch (error) {
      console.error('Error initializing user_follows table:', error);
      throw error;
    }
  }
} 