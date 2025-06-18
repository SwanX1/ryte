import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import { PostLikeModel } from '../models/PostLike';
import z from 'zod';
import { prettifyZodError } from '../util/zod';
import { AuditLogModel } from '../models/AuditLog';
import { PostCommentModel } from '../models/PostComment';
import { MediaProcessor } from '../util/mediaProcessor';

export class PostController {
  static async getPostPage(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    const post_id = parseInt(req.params.id);
    if (typeof post_id === "undefined" || isNaN(post_id)) {
      return next();  // Don't write anything, this will be picked up by the 404 handler
    }
    const post = await PostModel.findById(post_id);
    if (!post) return next();
    const author = await UserModel.findById(post.user);
    const sessionUserId = req.session?.userId;
    let liked = false;
    if (sessionUserId) {
      liked = !!(await PostLikeModel.find(sessionUserId, post_id));
    }

    const comments = await PostCommentModel.getCommentsForPost(post_id);
    const commentsWithUser = await Promise.all(comments.map(async (comment) => {
      const user = await UserModel.findById(comment.user_id);
      return {
        ...comment,
        username: user?.username || 'Unknown',
      };
    }));

    return res.render('post/view', {
      post: {
        ...post,
        username: author?.username || 'Unknown',
        user_id: author?.id,
        avatar_url: author?.avatar_url || '/assets/default_avatar.png',
        likeCount: (await PostLikeModel.getLikesForPost(post_id)).length,
        liked,
      },
      comments: commentsWithUser,
    });
  }

  static async createText(req: Request, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.redirect('/auth/login');
      }

      const { 'text-caption': caption, 'text-content': text } = req.body;
      
      if (!caption || !text) {
        return res.status(400).render('post/create', {
          error: 'Caption and text are required'
        });
      }

      const validatedCaption = z.string().min(1).max(100).trim().parse(caption);
      const validatedText = z.string().min(1).trim().parse(text);
      const content = `${validatedCaption}\n${validatedText}`;

      const post = await PostModel.create('text', content, userId);
      if (!post) {
        return res.status(500).render('post/create', {
          error: 'Error creating post'
        });
      }

      AuditLogModel.create('create', 'post', userId, post.id, `User ${userId} created text post ${post.id}`);

      return res.redirect(`/post/${post.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).render('post/create', {
          error: prettifyZodError(error)
        });
      }
      console.error('Error creating text post:', error);
      res.status(500).render('post/create', {
        error: 'An error occurred while creating the post'
      });
    }
  }

  static async createImages(req: Request, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.redirect('/auth/login');
      }

      const { 'images-caption': caption } = req.body;
      const files = req.files as Express.Multer.File[];
      
      if (!caption || !files || files.length === 0) {
        return res.status(400).render('post/create', {
          error: 'Caption and at least one image are required'
        });
      }

      const validatedCaption = z.string().min(1).max(100).trim().parse(caption);
      
      // Process images and convert to WebM
      const processedFilenames = await MediaProcessor.processFiles(files);
      const imageUrls = processedFilenames.map(filename => `/uploads/${filename}`);
      const content = `${validatedCaption}\n${imageUrls.join('\n')}`;

      const post = await PostModel.create('images', content, userId);
      if (!post) {
        return res.status(500).render('post/create', {
          error: 'Error creating post'
        });
      }

      AuditLogModel.create('create', 'post', userId, post.id, `User ${userId} created image post ${post.id} with ${files.length} images`);

      return res.redirect(`/post/${post.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).render('post/create', {
          error: prettifyZodError(error)
        });
      }
      console.error('Error creating image post:', error);
      res.status(500).render('post/create', {
        error: 'An error occurred while creating the post'
      });
    }
  }

  static async createVideo(req: Request, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.redirect('/auth/login');
      }

      const { 'video-caption': caption } = req.body;
      const file = req.file as Express.Multer.File;
      
      if (!caption || !file) {
        return res.status(400).render('post/create', {
          error: 'Caption and video are required'
        });
      }

      const validatedCaption = z.string().min(1).max(100).trim().parse(caption);
      
      // Process video and convert to WebM
      const processedFilename = await MediaProcessor.processFile(file);
      const videoUrl = `/uploads/${processedFilename}`;
      const content = `${validatedCaption}\n${videoUrl}`;

      const post = await PostModel.create('video', content, userId);
      if (!post) {
        return res.status(500).render('post/create', {
          error: 'Error creating post'
        });
      }

      AuditLogModel.create('create', 'post', userId, post.id, `User ${userId} created video post ${post.id}`);

      return res.redirect(`/post/${post.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).render('post/create', {
          error: prettifyZodError(error)
        });
      }
      console.error('Error creating video post:', error);
      res.status(500).render('post/create', {
        error: 'An error occurred while creating the post'
      });
    }
  }

  static getCreatePage(req: Request, res: Response) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/auth/login');
    }

    return res.render('post/create', {
      error: null
    });
  }

  static async delete(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
      
      const postIdParam = req.params.id;
      if (typeof postIdParam !== 'string') return res.status(400).json({ error: 'Invalid postId' });
      
      const postId = parseInt(postIdParam);
      if (isNaN(postId)) return res.status(400).json({ error: 'Invalid postId' });
      
      const post = await PostModel.findById(postId);
      if (!post || post.user !== userId) return res.status(403).json({ error: 'Forbidden' });
      
      const result = await PostModel.delete(postId);
      if (!result) return res.status(500).json({ error: 'Failed to delete post' });
      
      AuditLogModel.create('delete', 'post', userId, postId, `User ${userId} deleted post ${postId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'An error occurred while deleting the post' });
    }
  }
} 