import type { Request, Response } from 'express';
import { PostCommentModel } from '../models/PostComment';
import z from 'zod';
import { prettifyZodError } from '../util/zod';
import { AuditLogModel } from '../models/AuditLog';
import { UserModel } from '../models/User';
import { socketServer } from '../index';

export class CommentController {
  static async add(req: Request<{ postId: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' })
      
      // Check if user's email is verified
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!user.email_verified) {
        return res.status(403).json({ 
          error: 'Email verification required',
          message: 'Please verify your email address before creating comments.'
        });
      }

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
      
      // Broadcast new comment via WebSocket
      await socketServer.broadcastNewComment(postId, comment, user);
      
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
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
      
      // Check if user is the comment owner or has moderator/administrator role
      const user = await UserModel.findById(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      
      const isOwner = comment.user_id === userId;
      const isModerator = user.role === 'moderator' || user.role === 'administrator';
      
      if (!isOwner && !isModerator) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const result = await PostCommentModel.delete(commentId);
      if (!result) return res.status(500).json({ error: 'Failed to delete comment' });
      
      const actionDescription = isOwner 
        ? `User ${userId} deleted their own comment ${commentId}`
        : `Moderator ${userId} deleted comment ${commentId} by user ${comment.user_id}`;
      
      AuditLogModel.create('delete', 'comment', userId, commentId, actionDescription);
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
    const { role: sessionRole } = req.session?.userId ? (await UserModel.findById(req.session?.userId)) ?? { role: '' } : { role: '' };
    res.render('partials/comment', {
      title: 'Comment',
      comment: {
        ...comment,
        username: author?.username || 'Unknown',
        user_id: author?.id,
      },
      should_show_edit_button: req.session?.userId === comment.user_id,
      should_show_delete_button: req.session?.userId === comment.user_id || sessionRole === 'moderator' || sessionRole === 'administrator',
      layout: 'raw'
    });
  }

  static async getCommentForEdit(req: Request<{ commentId: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const commentId = parseInt(req.params.commentId);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment ID' });
      }

      const comment = await PostCommentModel.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({
        comment: {
          id: comment.id,
          content: comment.content
        }
      });
    } catch (error) {
      console.error('Error getting comment for edit:', error);
      res.status(500).json({ error: 'An error occurred while loading the comment' });
    }
  }

  static async update(req: Request<{ commentId: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const commentId = parseInt(req.params.commentId);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment ID' });
      }

      const comment = await PostCommentModel.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { content } = z.object({
        content: z.string().min(1).max(1000).trim()
      }).parse(req.body);

      const updatedComment = await PostCommentModel.update(commentId, content);
      if (!updatedComment) {
        return res.status(500).json({ error: 'Error updating comment' });
      }

      AuditLogModel.create('update', 'comment', userId, commentId, `User ${userId} updated comment ${commentId}`);

      res.json({ success: true, comment: updatedComment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: prettifyZodError(error) });
      }
      console.error('Error updating comment:', error);
      res.status(500).json({ error: 'An error occurred while updating the comment' });
    }
  }
} 