import type { Request, Response } from 'express';
import { PostModel, type Post } from '../models/Post';
import { UserModel } from '../models/User';
import { UserFollowModel } from '../models/UserFollow';
import { expandPosts } from './postController';

export class HomeController {
  static async getHomePage(req: Request, res: Response) {
    const sessionUserId = req.session?.userId;
    let personalizedPosts: any[] = [];
    let recentPosts = [];
    if (sessionUserId) {
      const followingIds = await UserFollowModel.getFollowingIds(sessionUserId);
      personalizedPosts = await PostModel.listByUsers([...followingIds, sessionUserId]);
      personalizedPosts = personalizedPosts.sort((a, b) => b.created_at - a.created_at);
    }

    recentPosts = await PostModel.searchByContent(''); // fetch all posts
    recentPosts = recentPosts.sort((a, b) => b.created_at - a.created_at);
    
    res.render('home/index', {
      title: 'RYTE',
      session_user: sessionUserId ? await UserModel.findById(sessionUserId) : null,
      personalizedPosts: await expandPosts(personalizedPosts),
      recentPosts: await expandPosts(recentPosts)
    });
  }
} 