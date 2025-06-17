import { Router } from 'express';
import { authRouter } from './auth';
import { profileRouter } from './profile';
import { postRouter } from './post';

const routes = Router();

routes.use('/auth', authRouter);
routes.use('/profile', profileRouter);
routes.use('/post', postRouter);

export default routes;