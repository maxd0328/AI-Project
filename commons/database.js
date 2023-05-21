const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DATABASE_ENDPOINT,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10
});

module.exports = pool;
