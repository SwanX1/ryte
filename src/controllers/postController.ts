import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import { PostLikeModel } from '../models/PostLike';
import z from 'zod';
import { prettifyZodError } from '../util/zod';

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
    return res.render('post/view', { post: {
      ...post,
      username: author?.username || 'Unknown',
      avatar_url: author?.avatar_url || '/assets/default_avatar.png',
      likeCount: (await PostLikeModel.getLikesForPost(post_id)).length,
      liked,
    } });
  }

  static async create(req: Request, res: Response) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.redirect('/auth/login');
      }

      let { type, content } = z.object({
        type: z.enum(['text', 'images', 'video']),
        content: z.string().min(1).trim()
      }).parse(req.body);

      if (type === 'images') {
        // Content is: first line is the caption, then the image URLs. Uploading is done beforehand, so URLs are already valid.
        let [caption, ...imageUrls] = content.split('\n');
        if (imageUrls.length === 0) {
          return res.status(400).render('post/create', {
            error: 'At least one image URL is required, this may be a bug'
          });
        }

        caption = z.string().min(1).max(100).trim().parse(caption);
        imageUrls = z.array(z.string().url().trim()).parse(imageUrls);

        content = `${caption}\n${imageUrls.join('\n')}`; // Make sure that everything is valid, justīns vāciņš
      }

      if (type === 'video') {
        // Content is: first line is the caption, then the video URL (only one is allowed). Uploading is done beforehand, so URL is already valid.
        let [caption, videoUrl] = content.split('\n');
        if (!videoUrl) {
          return res.status(400).render('post/create', {
            error: 'Video URL is required, this may be a bug'
          });
        }

        caption = z.string().min(1).max(100).trim().parse(caption);
        videoUrl = z.string().url().trim().parse(videoUrl);

        content = `${caption}\n${videoUrl}`;
      }

      if (type === 'text') {
        // Content is: first line is the caption, then the text.
        let [caption, text] = content.split('\n');
        if (!text) {
          return res.status(400).render('post/create', {
            error: 'Text is required, this may be a bug'
          });
        }

        caption = z.string().min(1).max(100).trim().parse(caption);
        text = z.string().min(1).trim().parse(text);

        content = `${caption}\n${text}`;
      }

      const post = await PostModel.create(type, content, userId);
      if (!post) {
        return res.status(500).render('post/create', {
          error: 'Error creating post'
        });
      }

      return res.redirect(`/post/${post.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).render('post/create', {
          error: prettifyZodError(error)
        });
      }
      console.error('Error creating post:', error);
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
} 