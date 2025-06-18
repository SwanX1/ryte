import type { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';

export function viewDataMiddleware(req: Request, res: Response, next: NextFunction) {
    // Store the original render function
    const originalRender = res.render;

    // Override the render function
    res.render = async function(view: string, options?: any, callback?: (err: Error, html: string) => void) {
        // Merge default data with provided options
        const defaultData = {
            session_user: req.session?.userId ? await UserModel.findById(req.session.userId) : null,
            layout: 'main',
            currentYear: new Date().getFullYear()
        };

        // If options is a function (callback), shift it to callback
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        // Merge the default data with the provided options
        const mergedOptions = { ...defaultData, ...options };

        // Call the original render function with merged options
        return originalRender.call(this, view, mergedOptions);
    };

    next();
} 