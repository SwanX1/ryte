import type { Request, Response } from 'express';
import { PostCommentModel } from '../models/PostComment';

export class CommentController {
  static async add(req: Request<{ postId: string }>, res: Response) {
    const userId = req.session?.userId;
    const postIdParam = req.params.postId;
    const { content } = req.body;
    if (!userId || typeof postIdParam !== 'string' || !content) return res.status(401).json({ error: 'Unauthorized or missing content' });
    const postId = parseInt(postIdParam);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
    const comment = await PostCommentModel.create(userId, postId, content);
    if (!comment) return res.status(400).json({ error: 'Error creating comment' });
    res.json({ comment });
  }

  static async delete(req: Request<{ commentId: string }>, res: Response) {
    const userId = req.session?.userId;
    const commentIdParam = req.params.commentId;
    if (!userId || typeof commentIdParam !== 'string') return res.status(401).json({ error: 'Unauthorized' });
    const commentId = parseInt(commentIdParam);
    if (isNaN(commentId)) return res.status(400).json({ error: 'Invalid commentId' });
    const comment = await PostCommentModel.findById(commentId);
    if (!comment || comment.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
    const result = await PostCommentModel.delete(commentId);
    res.json({ success: result });
  }

  static async list(req: Request<{ postId: string }>, res: Response) {
    const postIdParam = req.params.postId;
    if (typeof postIdParam !== 'string') return res.status(400).json({ error: 'Invalid postId' });
    const postId = parseInt(postIdParam);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
    const comments = await PostCommentModel.getCommentsForPost(postId);
    res.json({ comments });
  }
} 