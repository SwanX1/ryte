import type { Request, Response, NextFunction } from 'express';

export function viewDataMiddleware(req: Request, res: Response, next: NextFunction) {
    // Store the original render function
    const originalRender = res.render;

    // Override the render function
    res.render = function(view: string, options?: any, callback?: (err: Error, html: string) => void) {
        // Merge default data with provided options
        const defaultData = {
            user: req.session?.userId ? { id: req.session.userId } : null,
            layout: 'main'
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