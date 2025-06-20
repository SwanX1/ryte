import type { Request, Response } from 'express';
import { PostLikeModel } from '../models/PostLike';
import { AuditLogModel } from '../models/AuditLog';
import { socketServer } from '../index';

export class LikeController {
  static async like(req: Request<{ postId: string }>, res: Response) {
    const userId = req.session?.userId;
    const postIdParam = req.params.postId;
    if (!userId || typeof postIdParam !== 'string') return res.status(401).json({ error: 'Unauthorized' });
    const postId = parseInt(postIdParam);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
    const alreadyLiked = await PostLikeModel.find(userId, postId);
    if (alreadyLiked) return res.status(400).json({ error: 'Already liked' });
    const result = await PostLikeModel.create(userId, postId);
    if (!result) return res.status(500).json({ error: 'Error liking post' });
    
    // Get updated like count
    const likeCount = (await PostLikeModel.getLikesForPost(postId)).length;
    
    AuditLogModel.create('like', 'post', userId, postId, `User ${userId} liked post ${postId}`);
    
    // Broadcast like via WebSocket
    await socketServer.broadcastNewLike(postId, userId, likeCount);
    
    res.json({ success: true });
  }

  static async unlike(req: Request<{ postId: string }>, res: Response) {
    const userId = req.session?.userId;
    const postIdParam = req.params.postId;
    if (!userId || typeof postIdParam !== 'string') return res.status(401).json({ error: 'Unauthorized' });
    const postId = parseInt(postIdParam);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
    const result = await PostLikeModel.delete(userId, postId);
    
    // Get updated like count
    const likeCount = (await PostLikeModel.getLikesForPost(postId)).length;
    
    AuditLogModel.create('unlike', 'post', userId, postId, `User ${userId} unliked post ${postId}`);
    
    // Broadcast unlike via WebSocket
    await socketServer.broadcastNewLike(postId, userId, likeCount);
    
    res.json({ success: result });
  }

  static async likes(req: Request<{ postId: string }>, res: Response) {
    const postIdParam = req.params.postId;
    if (typeof postIdParam !== 'string') return res.status(400).json({ error: 'Invalid postId' });
    const postId = parseInt(postIdParam);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
    const users = await PostLikeModel.getLikesForPost(postId);
    res.json({ likes: users });
  }
}
