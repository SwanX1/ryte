import { PostController } from '../controllers/postController';
import { Router } from 'express';

export const postRouter = Router();

postRouter.route('/create').get(PostController.getCreatePage).post(PostController.create);
postRouter.get('/:id', PostController.getPostPage);