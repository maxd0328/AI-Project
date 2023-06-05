const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const { redisClient } = require('../instance/services');

const exprsession = require('express-session');
const RedisStore = require('connect-redis')(exprsession);

class Middleware {

    constructor(...handlers) {
        this.handlers = handlers;
    }

    apply(app) {
        for(let i = 0 ; i < this.handlers.length ; ++i)
            app.use(this.handlers[i]);
    }

}

class ViewEngineMiddleware extends Middleware {

    constructor(engine, directory) {
        super();
        this.engine = engine;
        this.directory = directory;
    }

    apply(app) {
        app.set('views', this.directory);
        app.set('view engine', this.engine);
    }

}

class RouterMiddleware extends Middleware {

    constructor(route, router) {
        super();
        this.route = route;
        this.router = router;
    }

    apply(app) {
        app.use(this.route, this.router);
    }

}

class MiddlewareRepository {

    static basic(loggerMode) {
        return new Middleware(
            logger(loggerMode),
            express.json(),
            express.urlencoded({ extended: false }),
            cookieParser()
        );
    }

    static viewEJS(directory) {
        return new ViewEngineMiddleware('ejs', directory);
    }

    static serveStatic(directory) {
        return new Middleware(express.static(directory));
    }

    static session(timeout = 1000 * 60 * 60 * 24) { // in ms
        return new Middleware(
            exprsession({
                store: new RedisStore({ client: redisClient }),
                secret: process.env.SESSION_SECRET,
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: false, //process.env.NODE_ENV === 'production', TODO FIX THIS WHEN HTTPS IS A THING
                    maxAge: timeout
                }
            })
        );
    }

    static errorHandler() {
        return new Middleware(
            function(err, req, res, next) {
                console.log(err);

                // set locals, only providing error when not in production
                res.locals.message = err.message;
                res.locals.error = req.app.get('env') !== 'production' ? err : {};
                let status = err.status || 500;

                // render the error page
                res.status(status);
                res.send(`${status}: internal server error`);
            }
        );
    }

    static router(route, router) {
        return new RouterMiddleware(route, router);
    }

}

module.exports = {
    Middleware,
    ViewEngineMiddleware,
    RouterMiddleware,
    MiddlewareRepository
};
