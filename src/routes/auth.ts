import { Router } from 'express';
import { AuthController } from '../controllers/authController';

export function createAuthRouter() {
  const router = Router();
  const authController = new AuthController();

  router.get('/signup', authController.getSignupPage.bind(authController));
  router.post('/signup', authController.signup.bind(authController));
  router.get('/login', authController.getLoginPage.bind(authController));
  router.post('/login', authController.login.bind(authController));
  router.get('/logout', authController.logout.bind(authController));

  return router;
} 