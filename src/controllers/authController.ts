import type { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { BaseController } from './BaseController';

export class AuthController extends BaseController {
  private userModel = new UserModel();

  async signup(req: Request, res: Response) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).render('auth/signup', {
          error: 'Username, email and password are required'
        });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).render('auth/signup', {
          error: 'Please enter a valid email address'
        });
      }

      const existingUser = await this.userModel.findByUsername(username);
      if (existingUser) {
        return res.status(400).render('auth/signup', {
          error: 'Username already exists'
        });
      }

      const existingEmail = await this.userModel.findByEmail(email);
      if (existingEmail) {
        return res.status(400).render('auth/signup', {
          error: 'Email already registered'
        });
      }

      const user = await this.userModel.create(username, email, password);
      if (!user) {
        return res.status(500).render('auth/signup', {
          error: 'Error creating user'
        });
      }

      // Set user session
      if (req.session) {
        req.session.userId = user.id;
      }

      // TODO: Send verification email here
      res.redirect('/');
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).render('auth/signup', {
        error: 'An error occurred during signup'
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).render('auth/login', {
          error: 'Username and password are required'
        });
      }

      const user = await this.userModel.findByUsername(username);
      if (!user) {
        return res.status(400).render('auth/login', {
          error: 'Invalid username or password'
        });
      }

      const isValidPassword = await this.userModel.verifyPassword(user, password);
      if (!isValidPassword) {
        return res.status(400).render('auth/login', {
          error: 'Invalid username or password'
        });
      }

      // Set user session
      if (req.session) {
        req.session.userId = user.id;
      }
      res.redirect('/');
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).render('auth/login', {
        error: 'An error occurred during login'
      });
    }
  }

  logout(req: Request, res: Response) {
    if (req.session) {
      req.session.destroy((err: Error | null) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).send('Error logging out');
        }
        res.redirect('/auth/login');
      });
    } else {
      res.redirect('/auth/login');
    }
  }

  getSignupPage(req: Request, res: Response) {
    res.render('auth/signup', { error: null });
  }

  getLoginPage(req: Request, res: Response) {
    res.render('auth/login', { error: null });
  }
} 