import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';
import { PostLikeModel } from '../models/PostLike';

export class PostController {
  static async getPostPage(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    const post_id = parseInt(req.params.id);
    if (typeof post_id === "undefined" || isNaN(post_id)) {
      return next();  // Don't write anything, this will be picked up by the 404 handler
    }
    const post = await PostModel.findById(post_id);
    if (!post) return next();
    const author = await UserModel.findById(post.user);
    
    return res.render('post/view', { likeCount: (await PostLikeModel.getLikesForPost(post_id)).length, post: {
      ...post,
      username: author?.username || 'Unknown',
      avatar_url: author?.avatar_url || '/assets/default_avatar.png',
    } });
  }

  static async create(req: Request, res: Response) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/auth/login');
    }

    const { type, content } = req.body;

    if (!type || !content) {
      return res.status(400).render('post/create', {
        error: 'Type and content are required'
      });
    }

    const post = await PostModel.create(type, content, userId);
    if (!post) {
      return res.status(500).render('post/create', {
        error: 'Error creating post'
      });
    }

    return res.redirect(`/post/${post.id}`);
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