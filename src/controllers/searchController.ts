import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import type { Request, Response } from 'express';
import z from 'zod';
import { expandPosts } from './postController';

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
    res.render('home/search', { q, users, posts: await expandPosts(posts) });
  }
}