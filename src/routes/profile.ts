import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';

const controller = new ProfileController();

export const profileRouter = controller.router()
  .get('/:id', controller.view)
  .build();

export const atRouter = controller.router()
  .get('/@:username', controller.viewByUsername)
  .build();