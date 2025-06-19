import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';

export const profileRouter = Router();
profileRouter.get('/:id', ProfileController.getProfilePage);
profileRouter.get('/delete', ProfileController.getDeletePage);
profileRouter.post('/delete', ProfileController.deleteAccount);