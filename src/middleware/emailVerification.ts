import type { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';

export function requireEmailVerification(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  // Check if user's email is verified
  UserModel.findById(userId).then(user => {
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Email verification required',
        message: 'Please verify your email address before creating posts or comments.'
      });
    }

    next();
  }).catch(error => {
    console.error('Error checking email verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  });
} 