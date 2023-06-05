const { Entity, S3Entity } = require('./entities/entity');
const ConfigStage = require('./entities/configStage');
const Datafile = require('./entities/dataset');
const Preset = require('./entities/preset');
const Project = require('./entities/project');
const Script = require('./entities/script');
const User = require('./entities/user');

const createExpressApp = require('./instance/express-app');
const { db, aws, logger, redisClient } = require('./instance/services');

const ActionSequence = require('./utils/actions');
const Assertions = require('./utils/assertions');
const { AWSClient, S3Client, SESClient } = require('./utils/aws-client');
const { DatabaseError, DatabaseConnection, DatabaseConnectionPool } = require('./utils/database');
const ServerError = require('./utils/error');
const Logger = require('./utils/logger');
const { Middleware, ViewEngineMiddleware, RouterMiddleware, MiddlewareRepository } = require('./utils/middleware');

const init = () => require('dotenv').config({ path: require('path').join(__dirname, `.env.${process.env.NODE_ENV}`) });

module.exports = {
    init,
    entities: {
        Entity,
        S3Entity,
        ConfigStage,
        Datafile,
        Preset,
        Project,
        Script,
        User
    },
    app: {
        createExpressApp
    },
    services: {
        db,
        aws,
        logger,
        redisClient
    },
    utils: {
        ActionSequence,
        Assertions,
        ServerError,
        Logger,
        aws: {
            AWSClient,
            S3Client,
            SESClient
        },
        database: {
            DatabaseError,
            DatabaseConnection,
            DatabaseConnectionPool
        },
        middleware: {
            Middleware,
            ViewEngineMiddleware,
            RouterMiddleware,
            MiddlewareRepository
        }
    }
};
