
/**
 * Module dependencies.
 */

const cookieParser = require('cookie-parser');
const logger = require('morgan');
const express = require("express");
const path = require("path");

const exprsession = require('express-session');
const RedisStore = require('connect-redis')(exprsession);
const Redis = require('ioredis');

/**
 * Basic middleware
 */

function basic(app) {
    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
}

function views(app) {
    app.set('views', path.join(__dirname, '../views'));
    app.set('view engine', 'ejs');
}

function directory(app) {
    app.use(express.static(path.join(__dirname, '../public')));
}

/**
 * Redis session middleware
 */

let redisClient;
if(process.env.NODE_ENV === 'development') {
    redisClient = new Redis({
        host: process.env.REDIS_CLUSTER_ENDPOINT,
        port: process.env.REDIS_CLUSTER_PORT
    });
}
else {
    redisClient = new Redis.Cluster(
        [
            {
                host: process.env.REDIS_CLUSTER_ENDPOINT,
                port: process.env.REDIS_CLUSTER_PORT
            }
        ],
        {
            dnsLookup: (address, callback) => callback(null, address),
            redisOptions: {
                tls: {}
            }
        }
    );
}

function session(app) {
    app.use(
        exprsession({
            store: new RedisStore({ client: redisClient }),
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: false, //process.env.NODE_ENV === 'production', FIX THIS WHEN HTTPS IS A THING
                maxAge: 1000 * 60 * 60 * 24 // session timeout, currently set to 1 day
            }
        })
    );
}

/**
 * Simple error handling middleware
 */

function error(app) {
    app.use(function(err, req, res, next) {
        console.log(err);

        // set locals, only providing error when not in production
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') !== 'production' ? err : {};
        let status = err.status || 500;

        // render the error page
        res.status(status);
        res.send(`${status}: internal server error`);
    });
}

/**
 * Export procedures
 */

module.exports = {
    basic,
    views,
    directory,
    redisClient,
    session,
    error
};
