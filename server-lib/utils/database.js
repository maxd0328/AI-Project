
class DatabaseError extends Error {

    static ERROR_TYPES = Object.freeze([
        {
            code: 'QUERY_AMBIGUOUS',
            http: 500,
            message: 'Server state corrupted'
        },
        {
            code: 'NO_SUCH_ENTRY',
            http: 404,
            message: 'Requested resource could not be located'
        },
        {
            code: 'ENTRY_CONFLICT',
            http: 409,
            message: 'Requested resource already exists'
        },
        {
            code: 'BAD_DATATYPE',
            http: 400,
            message: 'Request contains a datatype mismatch'
        },
        {
            code: 'CONSTRAINT_VIOLATED',
            http: 400,
            message: 'Request violates data preconditions'
        },
        {
            code: 'NO_FOREIGN_KEY',
            http: 400,
            message: 'Request references a resource which does not exist'
        },
        {
            code: 'REFERENCED_KEY',
            http: 409,
            message: 'Requested resource could not be altered due to a dependency'
        },
        {
            code: 'QUERY_FAULT',
            http: 500,
            message: 'An unexpected server fault has occurred'
        },
    ]);

    constructor(code, message = '', sqlcode = 'none') {
        if(!DatabaseError.ERROR_TYPES.map(type => type.code).includes(code))
            throw new Error(`No such database error code '${code}'`);

        super(message || DatabaseError.ERROR_TYPES.find(type => type.code === code).message);
        this.code = code;
        this.internal = internal;
        this.sqlcode = sqlcode;
    }

    httpStatus() {
        return DatabaseError.ERROR_TYPES.find(type => type.code === this.code).http;
    }

    httpMessage() {
        return DatabaseError.ERROR_TYPES.find(type => type.code === this.code).message;
    }

    getLog() {
        return `A database error has occurred: ${this.code} (SQL error code: ${this.sqlcode})
        ${this.stack}`;
    }

    static fromSQLError(err) {
        switch(err.errno) {
            case 1366:
            case 1048:
                return new DatabaseError('BAD_DATATYPE', err.message, err.code);
            case 1062:
                return new DatabaseError('ENTRY_CONFLICT', err.message, err.code);
            case 1217:
                return new DatabaseError('REFERENCED_KEY', err.message, err.code);
            case 1216:
                return new DatabaseError('NO_FOREIGN_KEY', err.message, err.code);
            case 3819:
                return new DatabaseError('CONSTRAINT_VIOLATED', err.message, err.code);
            default:
                return new DatabaseError('QUERY_FAULT', err.message, err.code);
        }
    }

}

class DatabaseConnection {

    constructor(conn) {
        this.conn = conn;
    }

    async #queryInternal(query, values, internal) {
        try {
            return await this.conn.query(query, values);
        }
        catch(err) {
            throw internal ? new DatabaseError('QUERY_FAULT') : DatabaseError.fromSQLError(err);
        }
    }

    async queryAny({ query, values, internal }) {
        const [rows] = await this.#queryInternal(query, values, internal);
        return rows;
    }

    async queryOne({ query, values, internal }) {
        const [rows] = await this.#queryInternal(query, values, internal);
        if(rows.length < 1)
            throw new DatabaseError(internal ? 'QUERY_FAULT' : 'NO_SUCH_ENTRY');
        else if(rows.length > 1)
            throw new DatabaseError(internal ? 'QUERY_FAULT' : 'QUERY_AMBIGUOUS');

        return rows[0];
    }

    async queryBinary({ query, values, internal }) {
        const [rows] = await this.#queryInternal(query, values, internal);
        if(rows.length > 1)
            throw new DatabaseError(internal ? 'QUERY_FAULT' : 'QUERY_AMBIGUOUS');
        return rows.length ? rows[0] : null;
    }

    async executeAny({ query, values, internal }) {
        const [result] = await this.#queryInternal(query, values, internal);
        return result;
    }

    async executeOne({ query, values, internal }) {
        const [result] = await this.#queryInternal(query, values, internal);
        if(result.affectedRows < 1)
            throw new DatabaseError(internal ? 'QUERY_FAULT' : 'NO_SUCH_ENTRY');
        else if(result.affectedRows > 1)
            throw new DatabaseError(internal ? 'QUERY_FAULT' : 'QUERY_AMBIGUOUS');

        return result;
    }

    async executeBinary({ query, values, internal }) {
        const [result] = await this.#queryInternal(query, values, internal);
        if(result.affectedRows > 1)
            throw new DatabaseError(internal ? 'QUERY_FAULT' : 'QUERY_AMBIGUOUS');

        return result;
    }

    async transaction(callback, rollbackCallback) {
        await this.conn.beginTransaction();

        try {
            const result = await callback(this);

            await this.conn.commit();
            return result;
        }
        catch(err) {
            await this.conn.rollback();

            if(rollbackCallback)
                await rollbackCallback(err);

            throw err;
        }
    }

}

class DatabaseConnectionPool extends DatabaseConnection {

    constructor(pool) {
        super(pool);
    }

    // Override
    async transaction(callback, rollbackCallback) {
        return this.openConnection(connection => connection.transaction(callback, rollbackCallback));
    }

    async openConnection(callback) {
        const newConnection = await this.conn.getConnection();
        const connectionObj = new DatabaseConnection(newConnection);

        try {
            return await callback(connectionObj);
        }
        finally {
            newConnection.release();
        }
    }

}

module.exports = {
    DatabaseError,
    DatabaseConnection,
    DatabaseConnectionPool
};
