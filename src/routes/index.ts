import { Router } from 'express';
import { authRouter } from './auth';
import { atRouter, profileRouter } from './profile';
import { postRouter } from './post';
import { searchRouter } from './search';
import { apiRouter } from './api';

const routes = Router();

routes.use('/auth', authRouter);
routes.use('/profile', profileRouter);
routes.use('/post', postRouter);
routes.use('/search', searchRouter);
routes.use('/api', apiRouter);
routes.use('/', atRouter); // Custom redirect route for /@username

export default routes;