import type { Request, Response } from 'express';
import { UserFollowModel } from '../models/UserFollow';
import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLog';

export class FollowController {
  static async follow(req: Request<{ userId: string }>, res: Response) {
    const followerId = req.session?.userId;
    const userIdParam = req.params.userId;
    if (!followerId || typeof userIdParam !== 'string') return res.status(401).json({ error: 'Unauthorized' });
    const followingId = parseInt(userIdParam);
    if (isNaN(followingId)) return res.status(400).json({ error: 'Invalid userId' });
    if (followerId === followingId) return res.status(400).json({ error: 'Cannot follow yourself' });
    const alreadyFollowing = await UserFollowModel.find(followerId, followingId);
    if (alreadyFollowing) return res.status(400).json({ error: 'Already following' });
    const result = await UserFollowModel.create(followerId, followingId);
    if (!result) return res.status(500).json({ error: 'Error following user' });
    AuditLogModel.create('follow', 'user', followerId, followingId, `User ${followerId} followed user ${followingId}`);
    res.json({ success: true });
  }

  static async unfollow(req: Request<{ userId: string }>, res: Response) {
    const followerId = req.session?.userId;
    const userIdParam = req.params.userId;
    if (!followerId || typeof userIdParam !== 'string') return res.status(401).json({ error: 'Unauthorized' });
    const followingId = parseInt(userIdParam);
    if (isNaN(followingId)) return res.status(400).json({ error: 'Invalid userId' });
    const result = await UserFollowModel.delete(followerId, followingId);
    AuditLogModel.create('unfollow', 'user', followerId, followingId, `User ${followerId} unfollowed user ${followingId}`);
    res.json({ success: result });
  }

  static async followers(req: Request<{ userId: string }>, res: Response) {
    const userIdParam = req.params.userId;
    if (typeof userIdParam !== 'string') return res.status(400).json({ error: 'Invalid userId' });
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });
    const ids = await UserFollowModel.getFollowerIds(userId);
    const users = await Promise.all(ids.map(id => UserModel.findById(id)));
    res.json({ followers: users.filter(Boolean) });
  }

  static async following(req: Request<{ userId: string }>, res: Response) {
    const userIdParam = req.params.userId;
    if (typeof userIdParam !== 'string') return res.status(400).json({ error: 'Invalid userId' });
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });
    const ids = await UserFollowModel.getFollowingIds(userId);
    const users = await Promise.all(ids.map(id => UserModel.findById(id)));
    res.json({ following: users.filter(Boolean) });
  }
} 