import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { PostModel, type Post } from '../models/Post';
import { UserFollowModel } from '../models/UserFollow';
import { PostLikeModel } from '../models/PostLike';
import { MediaProcessor } from '../util/mediaProcessor';
import { hashPassword, verifyPassword } from '../util/crypto';
import { query } from '../database/connection';
import { expandPosts } from './postController';

export class ProfileController {
  static async usernameRedirect(req: Request<{ username: string }>, res: Response, next: NextFunction) {
    const username = req.params.username;
    const user = await UserModel.findByUsername(username);
    if (user === null) {
      return next();
    }

    return res.redirect(`/profile/${user.id}`);
  }

  static async getProfilePage(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    // console.log(`Fetching profile for user ID: ${req.params.id}`);
    const user_id = parseInt(req.params.id);
    if (typeof user_id === "undefined" || isNaN(user_id)) {
      return next();  // Don't write anything, this will be picked up by the 404 handler
    }
    
    
    const user = await UserModel.findById(user_id);
    if (user === null) {
      return next();
    }

    const posts = await PostModel.listByUser(user.id);
    const sessionUserId = req.session?.userId;
    // Fetch follower and following counts
    const followerIds = await UserFollowModel.getFollowerIds(user.id);
    const followingIds = await UserFollowModel.getFollowingIds(user.id);
    
    // Check if current user is following this profile
    let isFollowing = false;
    if (sessionUserId && sessionUserId !== user.id) {
      isFollowing = !!(await UserFollowModel.find(sessionUserId, user.id));
    }

    let sessionUserVerified = false;
    if (sessionUserId) {
      const sessionUser = await UserModel.findById(sessionUserId);
      sessionUserVerified = sessionUser?.email_verified ?? false;
    }
    const profileUserVerified = user.email_verified;
    
    return res.render('profile/view', {
      title: `${user.username} - Profile`,
      layout: 'main',
      user: user,
      posts: await expandPosts(posts),
      followerCount: followerIds.length,
      followingCount: followingIds.length,
      isFollowing: isFollowing,
      isOwnProfile: sessionUserId === user.id,
    });
  }

  static async updateSettings(req: Request, res: Response) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { 'current-password': currentPassword, 'new-password': newPassword } = req.body;
      const avatarFile = req.file;

      // Get current user
      const currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Handle password change
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to change password' });
        }
        
        const isCurrentPasswordValid = await UserModel.verifyPassword(currentUser, currentPassword);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
      }

      // Process avatar if uploaded
      let avatarUrl = currentUser.avatar_url;
      if (avatarFile) {
        const processedFilename = await MediaProcessor.processFile(avatarFile);
        avatarUrl = `/uploads/${processedFilename}`;
      }

      // Update user in database
      const updateFields = [];
      const updateValues = [];

      if (newPassword) {
        const hashedPassword = await hashPassword(newPassword);
        updateFields.push('password = ?');
        updateValues.push(hashedPassword);
      }

      if (avatarUrl !== currentUser.avatar_url) {
        updateFields.push('avatar_url = ?');
        updateValues.push(avatarUrl);
      }

      if (updateFields.length > 0) {
        updateValues.push(userId);
        const queryString = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        await query(queryString, updateValues);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating profile settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getDeletePage(req: Request, res: Response) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/auth/login');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.redirect('/auth/login');
    }

    res.render('profile/delete', {
      title: 'Delete Account',
      user: user,
      error: null
    });
  }

  static async deleteAccount(req: Request, res: Response) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/auth/login');
    }

    const { password, 'confirm-delete': confirmDelete } = req.body;

    if (!password || !confirmDelete) {
      return res.render('profile/delete', {
        title: 'Delete Account',
        user: await UserModel.findById(userId),
        error: 'Password and confirmation are required'
      });
    }

    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.redirect('/auth/login');
      }

      // Verify password
      const isPasswordValid = await UserModel.verifyPassword(user, password);
      if (!isPasswordValid) {
        return res.render('profile/delete', {
          title: 'Delete Account',
          user: user,
          error: 'Incorrect password'
        });
      }

      // Delete user (this will cascade to related data due to foreign key constraints)
      await query('DELETE FROM users WHERE id = ?', [userId]);

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        res.redirect('/');
      });

    } catch (error) {
      console.error('Error deleting account:', error);
      res.render('profile/delete', {
        title: 'Delete Account',
        user: await UserModel.findById(userId),
        error: 'An error occurred while deleting your account. Please try again.'
      });
    }
  }
}
