import { Router } from 'express';
import { authRouter } from './auth';
import { profileRouter } from './profile';

const routes = Router();

routes.use('/auth', authRouter);
routes.use('/profile', profileRouter);

export default routes;