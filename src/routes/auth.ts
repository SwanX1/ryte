import { AuthController } from '../controllers/authController';
import { Router } from 'express';

export const authRouter = Router();

authRouter.route('/signup')
  .get(AuthController.getSignupPage)
  .post(AuthController.signup);

authRouter.route('/login')
  .get(AuthController.getLoginPage)
  .post(AuthController.login);

authRouter
  .get('/logout', AuthController.logout);

authRouter.post('/resend-verification', AuthController.resendVerificationEmail);

authRouter.route('/verify-email')
  .get(AuthController.getVerifyEmailPage)
  .post(AuthController.verifyEmail);