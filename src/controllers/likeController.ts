import type { Request, Response } from 'express';
import { PostLikeModel } from '../models/PostLike';
import { UserModel } from '../models/User';
import { BaseController } from './BaseController';

export class LikeController extends BaseController {
  private likeModel = new PostLikeModel();
  private userModel = new UserModel();

  async like(req: Request<{ postId: string }>, res: Response) {
    const userId = req.session?.userId;
    const postIdParam = req.params.postId;
    if (!userId || typeof postIdParam !== 'string') return res.status(401).json({ error: 'Unauthorized' });
    const postId = parseInt(postIdParam);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
    const alreadyLiked = await this.likeModel.find(userId, postId);
    if (alreadyLiked) return res.status(400).json({ error: 'Already liked' });
    const result = await this.likeModel.create(userId, postId);
    if (!result) return res.status(500).json({ error: 'Error liking post' });
    res.json({ success: true });
  }

  async unlike(req: Request<{ postId: string }>, res: Response) {
    const userId = req.session?.userId;
    const postIdParam = req.params.postId;
    if (!userId || typeof postIdParam !== 'string') return res.status(401).json({ error: 'Unauthorized' });
    const postId = parseInt(postIdParam);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
    const result = await this.likeModel.delete(userId, postId);
    res.json({ success: result });
  }

  async likes(req: Request<{ postId: string }>, res: Response) {
    const postIdParam = req.params.postId;
    if (typeof postIdParam !== 'string') return res.status(400).json({ error: 'Invalid postId' });
    const postId = parseInt(postIdParam);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
    const users = await this.likeModel.getLikesForPost(postId);
    res.json({ likes: users });
  }
} 