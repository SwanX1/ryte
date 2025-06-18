import { Router } from 'express';
import { FollowController } from '../controllers/followController';
import { LikeController } from '../controllers/likeController';
import { CommentController } from '../controllers/commentController';

export const apiRouter = Router();

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
