import type { Request, Response } from 'express';
import { UserFollowModel } from '../models/UserFollow';
import { UserModel } from '../models/User';
import { BaseController } from './BaseController';

export class FollowController extends BaseController {
  private followModel = new UserFollowModel();
  private userModel = new UserModel();

  async follow(req: Request<{ userId: string }>, res: Response) {
    const followerId = req.session?.userId;
    const userIdParam = req.params.userId;
    if (!followerId || typeof userIdParam !== 'string') return res.status(401).json({ error: 'Unauthorized' });
    const followingId = parseInt(userIdParam);
    if (isNaN(followingId)) return res.status(400).json({ error: 'Invalid userId' });
    if (followerId === followingId) return res.status(400).json({ error: 'Cannot follow yourself' });
    const alreadyFollowing = await this.followModel.find(followerId, followingId);
    if (alreadyFollowing) return res.status(400).json({ error: 'Already following' });
    const result = await this.followModel.create(followerId, followingId);
    if (!result) return res.status(500).json({ error: 'Error following user' });
    res.json({ success: true });
  }

  async unfollow(req: Request<{ userId: string }>, res: Response) {
    const followerId = req.session?.userId;
    const userIdParam = req.params.userId;
    if (!followerId || typeof userIdParam !== 'string') return res.status(401).json({ error: 'Unauthorized' });
    const followingId = parseInt(userIdParam);
    if (isNaN(followingId)) return res.status(400).json({ error: 'Invalid userId' });
    const result = await this.followModel.delete(followerId, followingId);
    res.json({ success: result });
  }

  async followers(req: Request<{ userId: string }>, res: Response) {
    const userIdParam = req.params.userId;
    if (typeof userIdParam !== 'string') return res.status(400).json({ error: 'Invalid userId' });
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });
    const ids = await this.followModel.getFollowerIds(userId);
    const users = await Promise.all(ids.map(id => this.userModel.findById(id)));
    res.json({ followers: users.filter(Boolean) });
  }

  async following(req: Request<{ userId: string }>, res: Response) {
    const userIdParam = req.params.userId;
    if (typeof userIdParam !== 'string') return res.status(400).json({ error: 'Invalid userId' });
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });
    const ids = await this.followModel.getFollowingIds(userId);
    const users = await Promise.all(ids.map(id => this.userModel.findById(id)));
    res.json({ following: users.filter(Boolean) });
  }
} 