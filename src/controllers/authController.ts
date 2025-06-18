import type { Request, Response } from 'express';
import { UserModel } from '../models/User';
import z from 'zod';
import { prettifyZodError } from '../util/zod';

export class AuthController {
  static async signup(req: Request, res: Response) {
    try {
      const { username, email, password } = z.object({
        username: z.string().min(3).max(20).trim().regex(/^[a-z0-9_.]+$/i),
        email: z.string().email().trim(),
        password: z.string().min(8).trim()
      }).parse(req.body);

      if (await UserModel.findByUsername(username)) {
        return res.status(400).render('auth/signup', {
          error: 'Username already exists'
        });
      }

      if (await UserModel.findByEmail(email)) {
        return res.status(400).render('auth/signup', {
          error: 'Email already registered'
        });
      }

      const user = await UserModel.create(username, email, password);
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
      if (error instanceof z.ZodError) {
        return res.status(400).render('auth/signup', {
          error: prettifyZodError(error)
        });
      }

      console.error('Signup error:', error);
      res.status(500).render('auth/signup', {
        error: 'An error occurred during signup'
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { username, password } = z.object({
        username: z.string().nonempty(),
        password: z.string().nonempty()
      }).parse(req.body);

      if (!username || !password) {
        return res.status(400).render('auth/login', {
          error: 'Username and password are required'
        });
      }

      const user = await UserModel.findByUsername(username);
      if (!user) {
        return res.status(400).render('auth/login', {
          error: 'Invalid username or password'
        });
      }

      const isValidPassword = await UserModel.verifyPassword(user, password);
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
      if (error instanceof z.ZodError) {
        return res.status(400).render('auth/login', {
          error: prettifyZodError(error)
        });
      }

      console.error('Login error:', error);
      res.status(500).render('auth/login', {
        error: 'An error occurred during login'
      });
    }
  }

  static logout(req: Request, res: Response) {
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

  static getSignupPage(req: Request, res: Response) {
    res.render('auth/signup', { error: null });
  }

  static getLoginPage(req: Request, res: Response) {
    res.render('auth/login', { error: null });
  }
} 