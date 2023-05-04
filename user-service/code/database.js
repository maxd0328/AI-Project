const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'awseb-e-crv2k26zps-stack-awsebrdsdatabase-3zbu0ldnj8jv.cjdntczfqnyu.us-east-1.rds.amazonaws.com',
    port: '3306',
    user: 'root',
    password: 'De4rkGr1llBurg3r$!',
    database: 'ebdb',
    connectionLimit: 10
});

module.exports = pool;
