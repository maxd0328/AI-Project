const { db, aws } = require('../instance/services');
const internalAssert = require('assert');

function getSQLForDefined() {
    const definedKeys = this.keyAttribs.concat(this.attribs).filter(col => this[col] !== undefined);
    let conditions = definedKeys.map(col => `${col} = ?`).join(' AND ');
    let values = definedKeys.map(col => this[col]);

    if(conditions)
        conditions = 'WHERE ' + conditions;

    return [conditions, values];
};

class Entity {

    constructor(wrapper, table, keyAttribs, attribs, autoIncrement) {
        this.wrapper = wrapper;
        this.table = table;
        this.keyAttribs = keyAttribs;
        this.attribs = attribs;
        this.autoIncrement = autoIncrement;

        if(autoIncrement && keyAttribs.length !== 1)
            throw new Error('Auto increment may only be used with single keys');
    }

    assert(...args) {
        internalAssert(...args);
    }

    setOrdering(attrib, ascending) {
        this.orderAttrib = attrib;
        this.orderAscending = ascending;
    }

    useDefault() {
        const defaults = this.defaultParams();
        if(defaults)
            for(const field in defaults)
                if(defaults.hasOwnProperty(field) && typeof this[field] === 'undefined')
                    this[field] = defaults[field];
    }

    defaultParams() { // Implemented by subclasses to add default attrib values if they don't already exist
    }

    preconditions() { // Implemented by subclasses to assert preconditions before writing to the database
    }

    async create(connection = db) {
        if(this.attribs.includes('lastModified'))
            this.lastModified = Date.now();

        this.preconditions();

        const attribs = this.autoIncrement ? this.attribs : [...this.keyAttribs, ...this.attribs];
        const attribStr = attribs.join(', ');
        const valueStr = Array(attribs.length).fill('?').join(', ');
        const values = attribs.map(attrib => this[attrib]);

        const result = await connection.executeOne({
            query: `INSERT INTO ${this.table} (${attribStr}) VALUES (${valueStr})`,
            values
        });

        if(this.autoIncrement)
            this[this.keyAttribs[0]] = result.insertId;
        return result;
    }

    async save(connection = db) {
        if(this.attribs.includes('lastModified'))
            this.lastModified = Date.now();

        this.preconditions();

        const updates = this.attribs.map(attrib => `${attrib} = ?`).join(', ');
        const updateValues = this.attribs.map(attrib => this[attrib]);
        const conditions = this.keyAttribs.map(key => `${key} = ?`).join(' AND ');
        const conditionValues = this.keyAttribs.map(key => this[key]);

        return await connection.executeOne({
            query: `UPDATE ${this.table} SET ${updates} WHERE ${conditions}`,
            values: [...updateValues, ...conditionValues]
        });
    }

    async delete(connection = db, rollbackEvents = null) {
        this.preconditions();

        await this.finalize(connection, rollbackEvents);
        await this.cascade('finalize', connection, rollbackEvents);

        const conditions = this.keyAttribs.map(key => `${key} = ?`).join(' AND ');
        const values = this.keyAttribs.map(key => this[key]);

        return await connection.executeOne({
            query: `DELETE FROM ${this.table} WHERE ${conditions}`,
            values
        });
    }

    async exists(connection = db) {
        const [conditions, values] = getSQLForDefined.call(this);
        return (await connection.queryOne({
            query: `SELECT EXISTS(SELECT 1 FROM ${this.table} ${conditions}) AS rowExists`,
            values
        })).rowExists;
    }

    async onFetch(row, connection) { // Implemented by subclasses to do any additional database fetches necessary for building the object
    }

    async fetch(connection = db) {
        const [conditions, values] = getSQLForDefined.call(this);
        const row = await connection.queryBinary({
            query: `SELECT * FROM ${this.table} ${conditions}`,
            values
        });
        if(row) {
            if(!this.quickFetch) await this.onFetch(row, connection);
            return new this.wrapper(row);
        }
        else return null;
    }

    async fetchAll(connection = db) {
        const [conditions, values] = getSQLForDefined.call(this);
        const result = await connection.queryAny({
            query: `SELECT * FROM ${this.table} ${conditions} ${this.orderAttrib ? `ORDER BY ${this.orderAttrib} ${this.orderAscending ? 'ASC' : 'DESC'}` : ''}`,
            values
        });
        return await Promise.all(result.map(async row => {
            if(!this.quickFetch) await this.onFetch(row, connection);
            return new this.wrapper(row);
        }));
    }

    async fetchOne(connection = db) {
        const [conditions, values] = getSQLForDefined.call(this);
        const row = await connection.queryOne({
            query: `SELECT * FROM ${this.table} ${conditions}`,
            values
        });
        if(!this.quickFetch) await this.onFetch(row, connection);
        return new this.wrapper(row);
    }

    async finalize(connection, rollbackEvents) { // Implemented by subclasses to add a finalization procedure on top of just deleting the row
    }

    async cascade(action, connection, rollbackEvents) { // Implemented by subclasses to do any necessary cascades upon finalization (mainly for deleting S3 keys of related entities)
    }

    async forward(entity, action, connection, rollbackEvents) {
        const obj = {};
        for(const key of this.keyAttribs)
            if(this[key] !== undefined)
                obj[key] = this[key];

        if(!Object.keys(obj).length)
            return;

        const entities = new entity(obj).fetchAll(connection);
        for(const entity of entities)
            await entity[action](connection, rollbackEvents);
        for(const entity of entities)
            await entity.cascade(action, connection, rollbackEvents);
    }

}

class S3Entity extends Entity {

    constructor(wrapper, bucket, table, keyAttribs, attribs, autoIncrement) {
        super(wrapper, table, keyAttribs, attribs, autoIncrement);
        this.bucket = bucket;
    }

    genS3Key() {
        throw new Error('S3Entity.genS3Key() must be implemented by a subclass');
    }

    preconditionsS3() { // Implemented by subclasses to do any additional database fetches necessary for building the object
    }

    async contentExists() {
        this.preconditionsS3();
        return await aws.s3.resourceExists(this.bucket, this.genS3Key());
    }

    async fetchContent() {
        this.preconditionsS3();
        return await aws.s3.getResource(this.bucket, this.genS3Key());
    }

    async saveContent(content, rollbackEvents = null) {
        this.preconditionsS3();
        const backup = rollbackEvents && await this.contentExists() ? await aws.s3.getResource(this.bucket, this.genS3Key()) : null;
        await aws.s3.putResource(this.bucket, this.genS3Key(), content);
        if(rollbackEvents)
            rollbackEvents.push(async () => backup === null ? await this.deleteContent() : await this.saveContent(backup));
    }

    async saveContentStream(stream, rollbackEvents = null) {
        this.preconditionsS3();
        const backup = rollbackEvents && await this.contentExists() ? await aws.s3.getResource(this.bucket, this.genS3Key()) : null;
        await aws.s3.putResourceStream(this.bucket, this.genS3Key(), stream);
        if(rollbackEvents)
            rollbackEvents.push(async () => backup === null ? await this.deleteContent() : await this.saveContent(backup));
    }

    async deleteContent(rollbackEvents = null) {
        this.preconditionsS3();
        const backup = rollbackEvents && await this.contentExists() ? await aws.s3.getResource(this.bucket, this.genS3Key()) : null;
        await aws.s3.deleteResource(this.bucket, this.genS3Key());
        if(rollbackEvents && backup !== null)
            rollbackEvents.push(async () => await this.saveContent(backup));
    }

    async createPresignedURL(expiry = 60 * 60) {
        this.preconditionsS3();
        return await aws.s3.createPresignedURL(this.bucket, this.genS3Key(), expiry);
    }

    async finalize(connection, rollbackEvents) {
        await super.finalize(connection, rollbackEvents);
        await this.deleteContent(rollbackEvents);
    }

}

module.exports = {
    Entity,
    S3Entity
};
