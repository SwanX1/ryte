import express from 'express';
import cors from 'cors';
import { engine } from 'express-handlebars';
import { config } from './config';
import { routes } from './routes';
import path from 'path';

const app = express();

// View engine setup
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', routes);

// View routes
app.get('/', (req, res) => {
    res.render('home/index', {
        title: 'Home - Ryte',
        layout: 'main'
    });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Error - Ryte',
        message: 'Something went wrong!',
        layout: 'main'
    });
});

// Custom 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Not Found',
        message: 'The page you are looking for does not exist.',
        layout: 'main'
    });
});

export const startServer = () => {
    app.listen(config.port, () => {
        console.log(`Server is running on port ${config.port}`);
    });
};