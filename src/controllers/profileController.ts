import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { BaseController } from './BaseController';
import { PostModel } from '../models/Post';

export class ProfileController extends BaseController {
  private userModel = new UserModel();
  private postModel = new PostModel();

  async viewByUsername(req: Request<{ username: string }>, res: Response, next: NextFunction) {
    const username = req.params.username;
    const user = await this.userModel.findByUsername(username);
    if (user === null) {
      return next();
    }

    return res.redirect(`/profile/${user.id}`);
  }

  async view(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    // console.log(`Fetching profile for user ID: ${req.params.id}`);
    const user_id = parseInt(req.params.id);
    if (typeof user_id === "undefined" || isNaN(user_id)) {
      return next();  // Don't write anything, this will be picked up by the 404 handler
    }
    
    
    const user = await this.userModel.findById(user_id);
    if (user === null) {
      return next();
    }

    const posts = await this.postModel.listByUser(user.id);
    return res.render('profile/view', {
      title: `${user.username} - Profile`,
      user: user,
      posts: await Promise.all(posts.map(async (post) => {
        const author = await this.userModel.findById(post.user);
        return {
          ...post,
          username: author?.username || 'Unknown',
          avatar_url: author?.avatar_url || '/assets/default_avatar.png',
        };
      })),
    });
  }
} 