import { CommentController } from '../controllers/commentController';
import { PostController } from '../controllers/postController';
import { Router } from 'express';

export const partialsRouter = Router();

partialsRouter.get('/comment/:commentId', CommentController.getCommentPartial);