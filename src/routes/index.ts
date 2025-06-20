import { Router } from 'express';
import { authRouter } from './auth';
import { profileRouter } from './profile';
import { postRouter } from './post';
import { searchRouter } from './search';
import { apiRouter } from './api';
import { adminRouter } from './admin';
import { ProfileController } from '../controllers/profileController';
import { partialsRouter } from './partials';
import { HomeController } from '../controllers/homeController';
import { ChatController } from '../controllers/chatController';

const routes = Router();

routes.use('/auth', authRouter);
routes.use('/profile', profileRouter);
routes.use('/post', postRouter);
routes.use('/search', searchRouter);
routes.use('/api', apiRouter);
routes.use('/admin', adminRouter);
routes.use('/partials', partialsRouter);
routes.get('/@:username', ProfileController.usernameRedirect); // Custom redirect route for /@username
routes.get('/', HomeController.getHomePage);
routes.get('/chats/:userId', ChatController.showChat);
routes.post('/chats/:chatId/send', ChatController.sendMessage);

export default routes;