import type { Request, Response } from 'express';
import { PostCommentModel } from '../models/PostComment';
import z from 'zod';
import { prettifyZodError } from '../util/zod';
import { AuditLogModel } from '../models/AuditLog';
import { UserModel } from '../models/User';

export class CommentController {
  static async add(req: Request<{ postId: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' })
      const postIdParam = req.params.postId;
      if (typeof postIdParam !== 'string') return res.status(400).json({ error: 'Invalid postId' });
      const { content } = z.object({
        content: z.string().min(1).max(1000).trim()
      }).parse(req.body);
      const postId = parseInt(postIdParam);
      if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
      const comment = await PostCommentModel.create(userId, postId, content);
      if (!comment) return res.status(400).json({ error: 'Error creating comment' });
      AuditLogModel.create('comment', 'post', userId, postId, `User ${userId} commented on post ${postId}`);
      res.json({ comment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: prettifyZodError(error) });
      }
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'An error occurred while adding the comment' });
    }
  }

  static async delete(req: Request<{ commentId: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
      const commentIdParam = req.params.commentId;
      if (typeof commentIdParam !== 'string') return res.status(400).json({ error: 'Invalid commentId' });
      const commentId = parseInt(commentIdParam);
      if (isNaN(commentId)) return res.status(400).json({ error: 'Invalid commentId' });
      const comment = await PostCommentModel.findById(commentId);
      if (!comment || comment.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
      const result = await PostCommentModel.delete(commentId);
      AuditLogModel.create('comment', 'post', userId, commentId, `User ${userId} deleted comment ${commentId}`);
      res.json({ success: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: prettifyZodError(error) });
      }
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'An error occurred while deleting the comment' });
    }
  }

  static async list(req: Request<{ postId: string }>, res: Response) {
    const postIdParam = req.params.postId;
    if (typeof postIdParam !== 'string') return res.status(400).json({ error: 'Invalid postId' });
    const postId = parseInt(postIdParam);
    if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
    const comments = await PostCommentModel.getCommentsForPost(postId);
    res.json({ comments });
  }

  static async getCommentPartial(req: Request<{ commentId: string }>, res: Response) {
    const commentIdParam = req.params.commentId;
    if (typeof commentIdParam !== 'string') return res.status(400).json({ error: 'Invalid commentId' });
    const commentId = parseInt(commentIdParam);
    if (isNaN(commentId)) return res.status(400).json({ error: 'Invalid commentId' });
    const comment = await PostCommentModel.findById(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const author = await UserModel.findById(comment.user_id);
    res.render('partials/comment', {
      comment: {
        ...comment,
        username: author?.username || 'Unknown',
        user_id: author?.id,
      },
      layout: 'raw'
    });
  }
} 