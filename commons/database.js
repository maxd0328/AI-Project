const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DATABASE_ENDPOINT,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10
});

const query = async(query, values) => await pool.query(query, values);

const transaction = async(callback, errCallback) => {
    const connection = pool.getConnection();
    await connection.beginTransaction();

    try {
        const result = await callback(connection);

        await connection.commit();
        return result;
    }
    catch(err) {
        await connection.rollback();

        if(errCallback)
            await errCallback(err);

        throw err;
    }
    finally {
        connection.release();
    }
};

module.exports = {
    pool,
    query,
    transaction
};
