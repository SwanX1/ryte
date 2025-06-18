import { Router } from 'express';
import { FollowController } from '../controllers/followController';
import { LikeController } from '../controllers/likeController';
import { CommentController } from '../controllers/commentController';

export const apiRouter = Router();

// Follow endpoints
const followController = new FollowController();
apiRouter.use('/follow', followController.router()
.post('/:userId', followController.follow)
.delete('/:userId', followController.unfollow)
.build());

apiRouter.use('/followers', followController.router()
.get('/:userId', followController.followers)
.build());

apiRouter.use('/following', followController.router()
.get('/:userId', followController.following)
.build());

// Like endpoints
const likeController = new LikeController();
apiRouter.use('/like', likeController.router()
.post('/:postId', likeController.like)
.delete('/:postId', likeController.unlike)
.build());

apiRouter.use('/likes', likeController.router()
.get('/:postId', likeController.likes)
.build()); 

// Comment endpoints
const commentController = new CommentController();
apiRouter.use('/comment', commentController.router()
.post('/:postId', commentController.add)
  .delete('/:commentId', commentController.delete)
  .build());

apiRouter.use('/comments', commentController.router()
  .get('/:postId', commentController.list)
  .build());
