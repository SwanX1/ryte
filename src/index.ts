import express from 'express';
import cors from 'cors';
import { engine } from 'express-handlebars';
import session from 'express-session';
import type { Request, Response, NextFunction } from 'express';
import { config } from './config';
import { viewDataMiddleware } from './middleware/viewData';
import { UserModel } from './models/User';
import path from 'path';
import routes from './routes';
import { PostModel } from './models/Post';
import { UserFollowModel } from './models/UserFollow';
import { AuditLogModel } from './models/AuditLog';
import { PostLikeModel } from './models/PostLike';
import { PostCommentModel } from './models/PostComment';
import { getConnection } from './database/connection';
import { SessionStore } from './util/sessionStore';

const app = express();

// View engine setup
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    'eq': (a: any, b: any) => a === b,
    'neq': (a: any, b: any) => a !== b,
    'localDate': (date: number) => new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    'splitLines': (str: string) => (typeof str === 'string' ? str.split('\n') : []),
    'joinLines': (arr: any[], start: number) => Array.isArray(arr) ? arr.slice(start).join('\n') : ''
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
  dotfiles: 'ignore'
}));

// Session middleware
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new SessionStore(),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View data middleware (must be after session middleware)
app.use(viewDataMiddleware);

// Routes
app.use(routes);

// View routes
app.get('/', (req: Request, res: Response) => {
  res.render('home/index', {
    title: 'Home - Ryte'
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error - Ryte',
    message: '500 - Something went wrong!'
  });
});

// Custom 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).render('error', {
    title: '404 - Not Found',
    message: '404 - The page you are looking for does not exist.'
  });
});

// Initialize database tables
[
  UserModel.initTable(),
  PostModel.initTable(),
  UserFollowModel.initTable(),
  PostLikeModel.initTable(),
  PostCommentModel.initTable(),
  AuditLogModel.initTable()
].forEach(p => p.catch(error => {
  console.error('Failed to initialize table:', error);
  process.exit(1);
}));

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});