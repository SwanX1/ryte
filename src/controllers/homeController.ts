import type { Request, Response } from 'express';
import { PostModel, type Post } from '../models/Post';
import { UserModel } from '../models/User';
import { UserFollowModel } from '../models/UserFollow';
import { PostLikeModel } from '../models/PostLike';

export class HomeController {
  static async getHomePage(req: Request, res: Response) {
    const sessionUserId = req.session?.userId;
    let personalizedPosts: any[] = [];
    let recentPosts = [];
    if (sessionUserId) {
      const followingIds = await UserFollowModel.getFollowingIds(sessionUserId);
      personalizedPosts = followingIds.length > 0 ? await PostModel.listByUsers(followingIds) : [];
      personalizedPosts = await Promise.all(personalizedPosts.map(async (post) => {
        const author = await UserModel.findById(post.user);
        const likeCount = (await PostLikeModel.getLikesForPost(post.id)).length;
        let liked = false;
        if (sessionUserId) {
          liked = !!(await PostLikeModel.find(sessionUserId, post.id));
        }
        return {
          ...post,
          username: author?.username || 'Unknown',
          avatar_url: author?.avatar_url || '/assets/default_avatar.png',
          likeCount,
          liked,
        };
      }));
    }

    recentPosts = await PostModel.searchByContent(''); // fetch all posts
    recentPosts = recentPosts.sort((a, b) => b.created_at - a.created_at);
    recentPosts = await Promise.all(recentPosts.map(async (post) => {
      const author = await UserModel.findById(post.user);
      const likeCount = (await PostLikeModel.getLikesForPost(post.id)).length;
      let liked = false;
      if (sessionUserId) {
        liked = !!(await PostLikeModel.find(sessionUserId, post.id));
      }
      return {
        ...post,
        username: author?.username || 'Unknown',
        avatar_url: author?.avatar_url || '/assets/default_avatar.png',
        likeCount,
        liked,
      };
    }));
    
    if (sessionUserId) {
      personalizedPosts = personalizedPosts.sort((a, b) => b.created_at - a.created_at);
    }
    res.render('home/index', {
      session_user: sessionUserId ? await UserModel.findById(sessionUserId) : null,
      personalizedPosts,
      recentPosts
    });
  }
} 