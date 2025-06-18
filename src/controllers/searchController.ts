import { BaseController } from './BaseController';
import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import type { Request, Response } from 'express';

export class SearchController extends BaseController {
  private userModel = new UserModel();
  private postModel = new PostModel();

  async search(req: Request, res: Response) {
    const q = req.query.q as string || '';
    if (!q.trim()) {
      return res.render('home/search', { q, users: [], posts: [] });
    }
    const [users, posts] = await Promise.all([
      this.userModel.searchByUsername(q),
      this.postModel.searchByContent(q)
    ]);
    res.render('home/search', { q, users, posts });
  }
} 