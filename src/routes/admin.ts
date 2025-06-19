import { Router } from 'express';
import { AdminController } from '../controllers/adminController';

export const adminRouter = Router();

// Admin pages
adminRouter.get('/users', AdminController.getUsersPage);