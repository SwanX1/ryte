import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import { UserFollowModel } from '../models/UserFollow';

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
    // Fetch follower and following counts
    const followerIds = await UserFollowModel.getFollowerIds(user.id);
    const followingIds = await UserFollowModel.getFollowingIds(user.id);
    return res.render('profile/view', {
      title: `${user.username} - Profile`,
      user: user,
      posts: await Promise.all(posts.map(async (post) => {
        const author = await UserModel.findById(post.user);
        return {
          ...post,
          username: author?.username || 'Unknown',
          avatar_url: author?.avatar_url || '/assets/default_avatar.png',
        };
      })),
      followerCount: followerIds.length,
      followingCount: followingIds.length,
    });
  }
} 