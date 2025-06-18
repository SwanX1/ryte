import { PostController } from '../controllers/postController';
import { Router } from 'express';
import { handleImageUpload, handleVideoUpload } from '../middleware/upload';

export const postRouter = Router();

postRouter.get('/create', PostController.getCreatePage);

// Separate routes for each post type
postRouter.post('/create/text', PostController.createText);
postRouter.post('/create/images', handleImageUpload, PostController.createImages);
postRouter.post('/create/video', handleVideoUpload, PostController.createVideo);
  
postRouter.get('/:id', PostController.getPostPage);