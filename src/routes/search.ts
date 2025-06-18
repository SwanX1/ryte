import { SearchController } from '../controllers/searchController';
import { Router } from 'express';

export const searchRouter = Router();
searchRouter.get('/', SearchController.getSearchPage); 