import { SearchController } from '../controllers/searchController';

const controller = new SearchController();

export const searchRouter = controller.router()
  .get('/', controller.search)
  .build(); 