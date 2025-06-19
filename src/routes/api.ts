import { Router } from 'express';
import { FollowController } from '../controllers/followController';
import { LikeController } from '../controllers/likeController';
import { CommentController } from '../controllers/commentController';
import { PostController } from '../controllers/postController';
import { ProfileController } from '../controllers/profileController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const apiRouter = Router();

// Configure multer for avatar uploads
const uploadsDir = path.join(process.cwd(), 'src', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('avatar');

// Follow endpoints
apiRouter.post('/follow/:userId', FollowController.follow);
apiRouter.delete('/follow/:userId', FollowController.unfollow);
apiRouter.get('/followers/:userId', FollowController.followers);
apiRouter.get('/following/:userId', FollowController.following);

// Like endpoints
apiRouter.post('/like/:postId', LikeController.like);
apiRouter.delete('/like/:postId', LikeController.unlike);
apiRouter.get('/likes/:postId', LikeController.likes);

// Comment endpoints
apiRouter.post('/comment/:postId', CommentController.add);
apiRouter.delete('/comment/:commentId', CommentController.delete);
apiRouter.get('/comments/:postId', CommentController.list);
apiRouter.get('/comment/:commentId/edit', CommentController.getCommentForEdit);
apiRouter.put('/comment/:commentId', CommentController.update);

// Post endpoints
apiRouter.delete('/post/:id', PostController.delete);

// Profile endpoints
apiRouter.put('/profile/settings', avatarUpload, ProfileController.updateSettings);
