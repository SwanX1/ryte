import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import type { Request, Response } from 'express';

export class SearchController {
  static async getSearchPage(req: Request, res: Response) {
    const q = req.query.q as string || '';
    if (!q.trim()) {
      return res.render('home/search', { q, users: [], posts: [] });
    }
    const [users, posts] = await Promise.all([
      UserModel.searchByUsername(q),
      PostModel.searchByContent(q)
    ]);
    res.render('home/search', { q, users, posts });
  }
} 