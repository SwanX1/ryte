import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { PostModel, type Post } from '../models/Post';
import { PostLikeModel } from '../models/PostLike';
import z from 'zod';
import { prettifyZodError } from '../util/zod';
import { AuditLogModel } from '../models/AuditLog';
import { PostCommentModel } from '../models/PostComment';
import { MediaProcessor } from '../util/mediaProcessor';
import { socketServer } from '../index';

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
      title: 'Post',
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

      // Check if user's email is verified
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.redirect('/auth/login');
      }

      if (!user.email_verified) {
        return res.status(400).render('post/create', {
          error: 'Please verify your email address before creating posts.'
        });
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

      // Broadcast new post via WebSocket
      await socketServer.broadcastNewPost(post, user);

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

      // Check if user's email is verified
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.redirect('/auth/login');
      }

      if (!user.email_verified) {
        return res.status(400).render('post/create', {
          error: 'Please verify your email address before creating posts.'
        });
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

      // Broadcast new post via WebSocket
      await socketServer.broadcastNewPost(post, user);

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

      // Check if user's email is verified
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.redirect('/auth/login');
      }

      if (!user.email_verified) {
        return res.status(400).render('post/create', {
          error: 'Please verify your email address before creating posts.'
        });
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

      // Broadcast new post via WebSocket
      await socketServer.broadcastNewPost(post, user);

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
      title: 'Create Post',
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
      if (!post) return res.status(404).json({ error: 'Post not found' });
      
      // Check if user is the post owner or has moderator/administrator role
      const user = await UserModel.findById(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      
      const isOwner = post.user === userId;
      const isModerator = user.role === 'moderator' || user.role === 'administrator';
      
      if (!isOwner && !isModerator) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const result = await PostModel.delete(postId);
      if (!result) return res.status(500).json({ error: 'Failed to delete post' });
      
      const actionDescription = isOwner 
        ? `User ${userId} deleted their own post ${postId}`
        : `Moderator ${userId} deleted post ${postId} by user ${post.user}`;
      
      AuditLogModel.create('delete', 'post', userId, postId, actionDescription);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'An error occurred while deleting the post' });
    }
  }

  static async postDetails(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.user !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Parse content to extract caption and content
      const lines = post.content.split('\n');
      const caption = lines[0] || '';
      const content = lines.slice(1).join('\n') || '';

      res.json({
        post: {
          id: post.id,
          type: post.type,
          caption,
          content
        }
      });
    } catch (error) {
      console.error('Error getting edit page:', error);
      res.status(500).json({ error: 'An error occurred while loading the post' });
    }
  }

  static async updateText(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.user !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { caption, content } = req.body;
      
      if (!caption || !content) {
        return res.status(400).json({ error: 'Caption and content are required' });
      }

      const validatedCaption = z.string().min(1).max(100).trim().parse(caption);
      const validatedContent = z.string().min(1).trim().parse(content);
      const newContent = `${validatedCaption}\n${validatedContent}`;

      const updatedPost = await PostModel.update(postId, newContent);
      if (!updatedPost) {
        return res.status(500).json({ error: 'Error updating post' });
      }

      AuditLogModel.create('update', 'post', userId, postId, `User ${userId} updated text post ${postId}`);

      res.json({ success: true, post: updatedPost });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: prettifyZodError(error) });
      }
      console.error('Error updating text post:', error);
      res.status(500).json({ error: 'An error occurred while updating the post' });
    }
  }

  static async updateImages(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.user !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { caption } = req.body;
      const files = req.files as Express.Multer.File[];
      const existingImages = Array.isArray(req.body.existingImages) ? req.body.existingImages : 
                           (req.body.existingImages ? [req.body.existingImages] : []);
      
      if (!caption) {
        return res.status(400).json({ error: 'Caption is required' });
      }

      const validatedCaption = z.string().min(1).max(100).trim().parse(caption);
      
      let imageUrls: string[] = [];
      
      // Add existing images that weren't removed
      imageUrls.push(...existingImages);
      
      // Process new images and convert to WebP
      if (files && files.length > 0) {
        const processedFilenames = await MediaProcessor.processFiles(files);
        const newImageUrls = processedFilenames.map(filename => `/uploads/${filename}`);
        imageUrls.push(...newImageUrls);
      }
      
      // Ensure at least one image remains
      if (imageUrls.length === 0) {
        return res.status(400).json({ error: 'At least one image is required' });
      }

      const newContent = `${validatedCaption}\n${imageUrls.join('\n')}`;

      const updatedPost = await PostModel.update(postId, newContent);
      if (!updatedPost) {
        return res.status(500).json({ error: 'Error updating post' });
      }

      AuditLogModel.create('update', 'post', userId, postId, `User ${userId} updated image post ${postId}`);

      res.json({ success: true, post: updatedPost });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: prettifyZodError(error) });
      }
      console.error('Error updating image post:', error);
      res.status(500).json({ error: 'An error occurred while updating the post' });
    }
  }

  static async updateVideo(req: Request<{ id: string }>, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.user !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { caption } = req.body;
      const file = req.file as Express.Multer.File;
      
      if (!caption) {
        return res.status(400).json({ error: 'Caption is required' });
      }

      const validatedCaption = z.string().min(1).max(100).trim().parse(caption);
      
      let videoUrl: string;
      if (file) {
        // Process new video and convert to WebM
        const processedFilename = await MediaProcessor.processFile(file);
        videoUrl = `/uploads/${processedFilename}`;
      } else {
        // Keep existing video
        const lines = post.content.split('\n');
        videoUrl = lines[1] || '';
      }

      const newContent = `${validatedCaption}\n${videoUrl}`;

      const updatedPost = await PostModel.update(postId, newContent);
      if (!updatedPost) {
        return res.status(500).json({ error: 'Error updating post' });
      }

      AuditLogModel.create('update', 'post', userId, postId, `User ${userId} updated video post ${postId}`);

      res.json({ success: true, post: updatedPost });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: prettifyZodError(error) });
      }
      console.error('Error updating video post:', error);
      res.status(500).json({ error: 'An error occurred while updating the post' });
    }
  }
} 

export async function expandPosts(posts: Post[]) {
  return await Promise.all(posts.map(async (post) => {
    const author = await UserModel.findById(post.user);
    const likeCount = (await PostLikeModel.getLikesForPost(post.id)).length;
    return {
      ...post,
      username: author?.username || 'Unknown',
      avatar_url: author?.avatar_url || '/assets/default_avatar.png',
      likeCount,
    };
  }))
}