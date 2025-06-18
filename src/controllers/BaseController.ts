import { Router as CreateRouter, type Request, type Response } from 'express';
import type { RequestHandler } from 'express';
import type { RouteParameters, Router } from 'express-serve-static-core';
import { UserModel } from '../models/User';
import { PostModel } from '../models/Post';

export abstract class BaseController {
  public router(): RouterFactory<this> {
    return new RouterFactory(this);
  }
}

export class RouterFactory<T extends BaseController = BaseController> {
  private router = CreateRouter();
  public constructor(private controller: T) {}

  public all<
    Route extends string,
    Handler extends RequestHandler<P>,
    P = RouteParameters<Route>,
  >(route: Route, handler: Handler): this {
    this.router.all(route, handler.bind(this.controller));
    return this;
  }

  public get<
    Route extends string,
    Handler extends RequestHandler<P>,
    P = RouteParameters<Route>,
  >(route: Route, handler: Handler): this {
    this.router.get(route, handler.bind(this.controller));
    return this;
  }

  public post<
    Route extends string,
    Handler extends RequestHandler<P>,
    P = RouteParameters<Route>,
  >(route: Route, handler: Handler): this {
    this.router.post(route, handler.bind(this.controller));
    return this;
  }

  public put<
    Route extends string,
    Handler extends RequestHandler<P>,
    P = RouteParameters<Route>,
  >(route: Route, handler: Handler): this {
    this.router.put(route, handler.bind(this.controller));
    return this;
  }

  public delete<
    Route extends string,
    Handler extends RequestHandler<P>,
    P = RouteParameters<Route>,
  >(route: Route, handler: Handler): this {
    this.router.delete(route, handler.bind(this.controller));
    return this;
  }

  public patch<
    Route extends string,
    Handler extends RequestHandler<P>,
    P = RouteParameters<Route>,
  >(route: Route, handler: Handler): this {
    this.router.patch(route, handler.bind(this.controller));
    return this;
  }

  public options<
    Route extends string,
    Handler extends RequestHandler<P>,
    P = RouteParameters<Route>,
  >(route: Route, handler: Handler): this {
    this.router.options(route, handler.bind(this.controller));
    return this;
  }

  public head<
    Route extends string,
    Handler extends RequestHandler<P>,
    P = RouteParameters<Route>,
  >(route: Route, handler: Handler): this {
    this.router.head(route, handler.bind(this.controller));
    return this;
  }

  public build(): Router {
    return this.router;
  }
}