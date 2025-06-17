import { PostController } from '../controllers/postController';

const controller = new PostController();

export const postRouter = controller.router()
  .get('/:id', controller.view)
  .get('/create', controller.createPage)
  .post('/create', controller.create)
  .build();