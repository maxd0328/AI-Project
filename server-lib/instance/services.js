const mysql = require('mysql2/promise');
const { DatabaseConnectionPool } = require('../utils/database');
const { AWSClient } = require('../utils/aws-client');
const Logger = require('../utils/logger');

const db = new DatabaseConnectionPool(mysql.createPool({
    host: process.env.DATABASE_ENDPOINT,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10
}));

const aws = new AWSClient({
    apiVersion: '2010-12-01',
    accessKeyId: process.env.NODE_ENV === 'development' ? process.env.S3_ACCESS_KEY_ID : null,
    secretAccessKey: process.env.NODE_ENV === 'development' ? process.env.S3_SECRET_ACCESS_KEY : null,
    endpoint: process.env.NODE_ENV === 'development' ? process.env.S3_ENDPOINT : null
});

const logger = new Logger(process.env.SERVICE, process.env.LOG_PATH);

aws.s3.ensureBucketExists(process.env.S3_USER_BUCKET).then(() => {});

module.exports = {
    db,
    aws,
    logger
};
