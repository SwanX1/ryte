import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { BaseController } from './BaseController';
import { PostModel } from '../models/Post';

export class PostController extends BaseController {
  private userModel = new UserModel();
  private postModel = new PostModel();

  async view(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    const post_id = parseInt(req.params.id);
    if (typeof post_id === "undefined" || isNaN(post_id)) {
      return next();  // Don't write anything, this will be picked up by the 404 handler
    }
    const post = await this.postModel.findById(post_id);
    if (!post) return next();
    const author = await this.userModel.findById(post.user);
    
    return res.render('post/view', { post: {
      ...post,
      username: author?.username || 'Unknown',
      avatar_url: author?.avatar_url || '/assets/default_avatar.png',
    } });
  }

  async create(req: Request, res: Response, next: NextFunction) {
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

    const post = await this.postModel.create(type, content, userId);
    if (!post) {
      return res.status(500).render('post/create', {
        error: 'Error creating post'
      });
    }

    return res.redirect(`/post/${post.id}`);
  }

  createPage(req: Request, res: Response) {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/auth/login');
    }

    return res.render('post/create', {
      error: null
    });
  }
} 