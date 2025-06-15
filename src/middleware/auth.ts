import type { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import { Database } from 'bun:sqlite';

export function createAuthMiddleware(db: Database) {
  const userModel = new UserModel(db);

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.redirect('/auth/login');
    }

    try {
      const user = await userModel.findById(req.session.userId);
      if (!user) {
        if (req.session) {
          req.session.destroy((err: Error | null) => {
            if (err) {
              console.error('Session destroy error:', err);
            }
            res.redirect('/auth/login');
          });
        } else {
          res.redirect('/auth/login');
        }
        return;
      }

      // Add user to request object for use in routes
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).send('Internal server error');
    }
  };
} 