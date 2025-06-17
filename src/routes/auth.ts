import { AuthController } from '../controllers/authController';

const controller = new AuthController();

export const authRouter = controller.router()
  .get('/signup', controller.getSignupPage)
  .post('/signup', controller.signup)
  .get('/login', controller.getLoginPage)
  .post('/login', controller.login)
  .get('/logout', controller.logout)
  .build();