import express from 'express';
import cors from 'cors';
import { engine } from 'express-handlebars';
import session from 'express-session';
import type { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
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
import { ChatMessageModel } from './models/ChatMessage';
import { ChatModel } from './models/Chat';
import { SocketServer } from './util/socketServer';
import fs from 'fs';
import { detectLocale } from './util/locale';

const app = express();
const server = createServer(app);

// Initialize WebSocket server
const socketServer = new SocketServer(server);

// View engine setup
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    'eq': (a: any, b: any) => a === b,
    'neq': (a: any, b: any) => a !== b,
    'or': (...args: any[]) => {
      // strip last arg, it's the method def
      args = args.slice(0, -1);
      return args.some(arg => arg);
    },
    'not': (a: any) => !a,
    'and': (...args: any[]) => args.every(arg => arg),
    'localDate': (date: number) => new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    'localDateTime': (date: number) => {
      // If it's the same day, return the time only
      if (new Date(date).toDateString() === new Date().toDateString()) {
        return new Date(date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      } else {
        new Date(date).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    },
    'splitLines': (str: string) => (typeof str === 'string' ? str.split('\n') : []),
    'joinLines': (arr: any[], start: number) => Array.isArray(arr) ? arr.slice(start).join('\n') : '',
    't': function (key: string, options: any) {
      const translations = options.data.root.translations || {};
      return t(translations, key, options.hash);
    }
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
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: false,
  }
}));

// Add locale/translation middleware before viewDataMiddleware
app.use((req, res, next) => {
  const locale = detectLocale(req.headers['accept-language']);
  res.locals.locale = locale;
  res.locals.translations = getTranslations(locale);
  next();
});

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
  AuditLogModel.initTable(),
  ChatModel.initTable(),
  ChatMessageModel.initTable()
].forEach(p => p.catch(error => {
  console.error('Failed to initialize table:', error);
  process.exit(1);
}));

server.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});

// Export socket server for use in controllers
export { socketServer };

function getTranslations(locale: string) {
  const localesDir = path.join(__dirname, 'locales');
  const file = path.join(localesDir, `${locale}.json`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf-8'));
}

function t(translations: any, key: string, options: any = {}) {
  let template = translations[key] || key;
  Object.keys(options).forEach((k) => {
    template = template.replace(new RegExp(`{{${k}}}`, 'g'), options[k]);
  });
  return template;
}