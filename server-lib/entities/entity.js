const { db, aws } = require('../instance/services');
const assert = require('assert');

const checkPreconditions = preconditions => {
    try {
        if(preconditions)
            preconditions();
    }
    catch(err) {
        if(err instanceof assert.AssertionError)
            console.error(`Preconditions failed; unable to write to database`);
        throw err;
    }
};

const getSQLForDefined = () => {
    const definedKeys = this.keys.concat(this.attribs).filter(col => this[col] !== undefined);
    const conditions = definedKeys.map(col => `${col} = ?`).join(' AND ');
    const values = definedKeys.map(col => this[col]);

    return [conditions, values];
};

class Entity {

    constructor(wrapper, table, keys, attribs, autoIncrement) {
        this.wrapper = wrapper;
        this.table = table;
        this.keys = keys;
        this.attribs = attribs;
        this.autoIncrement = autoIncrement;

        if(autoIncrement && keys.length !== 1)
            throw new Error('Auto increment may only be used with single keys');
    }

    assert = assert;

    preconditions() { // Implemented by subclasses to assert preconditions before writing to the database
    }

    async create(connection = db) {
        checkPreconditions(this.preconditions);

        const attribs = this.autoIncrement ? this.attribs : [...this.keys, ...this.attribs];
        const attribStr = attribs.join(', ');
        const valueStr = Array(attribs.length).fill('?').join(', ');
        const values = attribs.map(attrib => this[attrib]);

        const result = await connection.executeOne({
            query: `INSERT INTO ${this.table} (${attribStr}) VALUES (${valueStr})`,
            values
        });

        if(this.autoIncrement)
            this[this.keys[0]] = result.insertId;
        return result;
    }

    async save(connection = db) {
        checkPreconditions(this.preconditions);

        const updates = this.attribs.map(attrib => `${attrib} = ?`).join(', ');
        const updateValues = this.attribs.map(attrib => this[attrib]);
        const conditions = this.keys.map(key => `${key} = ?`).join(' AND ');
        const conditionValues = this.keys.map(key => this[key]);

        return await connection.executeOne({
            query: `UPDATE ${this.table} SET ${updates} WHERE ${conditions}`,
            values: [...updateValues, ...conditionValues]
        });
    }

    async delete(connection = db) {
        checkPreconditions(this.preconditions);

        await this.finalize(connection);
        await this.cascade('finalize', connection);

        const conditions = this.keys.map(key => `${key} = ?`).join(' AND ');
        const values = this.keys.map(key => this[key]);

        return await connection.executeOne({
            query: `DELETE FROM ${this.table} WHERE ${conditions}`,
            values
        });
    }

    async exists(connection = db) {
        const [conditions, values] = getSQLForDefined.call(this);
        return (await connection.queryOne({
            query: `SELECT EXISTS(SELECT 1 FROM ${this.table} WHERE ${conditions}) AS rowExists`,
            values
        })).rowExists;
    }

    async onFetch(row, connection) { // Implemented by subclasses to do any additional database fetches necessary for building the object
    }

    async fetch(connection = db) {
        const [conditions, values] = getSQLForDefined.call(this);
        const row = await connection.queryBinary({
            query: `SELECT * FROM ${this.table} WHERE ${conditions}`,
            values
        });
        if(row) {
            await this.onFetch(row, connection);
            return new this.wrapper(row);
        }
        else return null;
    }

    async fetchAll(connection = db) {
        const [conditions, values] = getSQLForDefined.call(this);
        const result = await connection.queryAny({
            query: `SELECT * FROM ${this.table} WHERE ${conditions}`,
            values
        });
        return await Promise.all(result.map(async row => {
            await this.onFetch(row, connection);
            return new this.wrapper(row);
        }));
    }

    async fetchOne(connection = db) {
        const [conditions, values] = getSQLForDefined.call(this);
        const row = await connection.queryOne({
            query: `SELECT *
                    FROM ${this.table}
                    WHERE ${conditions}`,
            values
        });
        await this.onFetch(row, connection);
        return new this.wrapper(row);
    }

    async finalize(connection) { // Implemented by subclasses to add a finalization procedure on top of just deleting the row
    }

    async cascade(action, connection) { // Implemented by subclasses to do any necessary cascades upon finalization (mainly for deleting S3 keys of related entities)
    }

    async forward(entity, action, connection) {
        const obj = {};
        for(const key of this.keys)
            if(this[key] !== undefined)
                obj[key] = this[key];

        if(!Object.keys(obj).length)
            return;

        const entities = new entity(obj).fetchAll(connection);
        for(const entity of entities)
            await entity[action](connection);
        for(const entity of entities)
            await entity.cascade(action, connection);
    }

}

class S3Entity extends Entity {

    constructor(wrapper, bucket, table, keys, attribs, autoIncrement) {
        super(wrapper, table, keys, attribs, autoIncrement);
        this.bucket = bucket;
    }

    genS3Key() {
        throw new Error('S3Entity.genS3Key() must be implemented by a subclass');
    }

    preconditionsS3() { // Implemented by subclasses to do any additional database fetches necessary for building the object
    }

    async fetchContent() {
        checkPreconditions(this.preconditionsS3);
        return await aws.s3.getResource(this.bucket, this.genS3Key());
    }

    async saveContent(content) {
        checkPreconditions(this.preconditionsS3);
        await aws.s3.putResource(this.bucket, this.genS3Key(), content);
    }

    async saveContentStream(stream) {
        checkPreconditions(this.preconditionsS3);
        await aws.s3.putResourceStream(this.bucket, this.genS3Key(), stream);
    }

    async deleteContent() {
        await aws.s3.deleteResource(this.bucket, this.genS3Key());
    }

    async createPresignedURL(expiry = 60 * 60) {
        checkPreconditions(this.preconditionsS3);
        return await aws.s3.createPresignedURL(this.bucket, this.genS3Key(), expiry);
    }

    async finalize(connection) {
        await super.finalize(connection);
        await this.deleteContent();
    }

}

module.exports = {
    Entity,
    S3Entity
};
