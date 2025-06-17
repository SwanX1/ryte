import type { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { BaseController } from './BaseController';

export class ProfileController extends BaseController {
  private userModel = new UserModel();

  async view(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    // console.log(`Fetching profile for user ID: ${req.params.id}`);
    const user_id = parseInt(req.params.id);
    if (typeof user_id === "undefined" || isNaN(user_id)) {
      return next();  // Don't write anything, this will be picked up by the 404 handler
    }
    
    
    const user = await this.userModel.findById(user_id);
    if (user === null) {
      return next();
    }
    
    return res.render('profile/view', {
      title: `${user.username} - Profile`,
      user: user,
    });
  }
} 