import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import { PostLikeModel } from '../models/PostLike';
import type { Request, Response } from 'express';
import z from 'zod';

export class SearchController {
  static async getSearchPage(req: Request, res: Response) {
    const q = z.string().trim().parse(req.query.q); // Should not error ever, if it does, it's a bug
    if (!q.trim()) {
      return res.render('home/search', { q, users: [], posts: [] });
    }
    const [users, posts] = await Promise.all([
      UserModel.searchByUsername(q),
      PostModel.searchByContent(q)
    ]);
    const sessionUserId = req.session?.userId;
    const postsWithLikes = await Promise.all(posts.map(async (post) => {
      const likeCount = (await PostLikeModel.getLikesForPost(post.id)).length;
      let liked = false;
      if (sessionUserId) {
        liked = !!(await PostLikeModel.find(sessionUserId, post.id));
      }
      return {
        ...post,
        likeCount,
        liked,
      };
    }));
    res.render('home/search', { q, users, posts: postsWithLikes });
  }
}