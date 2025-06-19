import { PostController } from '../controllers/postController';
import { Router } from 'express';
import { handleImageUpload, handleVideoUpload } from '../middleware/upload';
import multer from 'multer';

export const postRouter = Router();

postRouter.get('/create', PostController.getCreatePage);

// Use multer.none() for text posts to parse multipart form data
postRouter.post('/create/text', multer().none(), PostController.createText);
postRouter.post('/create/images', handleImageUpload, PostController.createImages);
postRouter.post('/create/video', handleVideoUpload, PostController.createVideo);
  
postRouter.get('/:id', PostController.getPostPage);

// Edit routes
postRouter.get('/:id/edit', PostController.postDetails);
postRouter.put('/:id/edit/text', PostController.updateText);
postRouter.put('/:id/edit/images', handleImageUpload, PostController.updateImages);
postRouter.put('/:id/edit/video', handleVideoUpload, PostController.updateVideo);