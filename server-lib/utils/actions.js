const { db, logger } = require('../instance/services');
const { DatabaseError } = require('./database');
const ServerError = require('./error');
const assert = require('assert');

function convertString(value) {
    if(value !== '' && !isNaN(Number(value)))
        return Number(value);
    else if(value === 'true')
        return true;
    else if (value === 'false')
        return false;
    else
        return value;
}

class ActionSequence {

    constructor() {
        this.actions = [];
    }

    append(action) {
        this.actions.push(action);
        return this;
    }

    async execute(req, res) {
        await new SequenceExecutor(this, req, res).execute();
    }

    async executeRemote({ query, body, session }) {
        const request = {
            query,
            body,
            session
        };

        const response = {
            status: status => this.valStatus = status,
            json: json => this.valJson = json
        };

        await new SequenceExecutor(this, request, response).execute();

        return new ActionResponse(response.valStatus, response.valJson);
    }

    export() {
        return async (req, res) => await this.execute(req, res);
    }

    // Built-in actions

    remap(oldName, newName) {
        return this.append(async (seq, props) => {
            seq.putResource(newName, props[oldName]);
            seq.deleteResource(oldName);
            await seq.proceed();
        });
    }

    remapMany(oldNames, newNames) {
        return this.append(async (seq, props) => {
            for(let i = 0 ; i < oldNames.length ; ++i) {
                seq.putResource(newNames[i], props[oldNames[i]]);
                seq.deleteResource(oldNames[i]);
            }
            await seq.proceed();
        });
    }

    assert(assertions, ...values) {
        return this.append(async (seq, props) => {
            for(let i = 0 ; i < values.length ; ++i) {
                if(!assertions.assert(props[values[i]])) {
                    seq.terminate(400, {message: `Bad value given for field '${values[i]}'`});
                    return;
                }
            }
            await seq.proceed();
        });
    }

    assertDynamic(assertions, generator) {
        return this.append(async (seq, props) => {
            const values = generator(props);
            for(let i = 0 ; i < values.length ; ++i) {
                if(!assertions.assert(values[i])) {
                    seq.terminate(400, {message: `Bad value given in request'`});
                    return;
                }
            }
            await seq.proceed();
        });
    }

    intermediate(func) {
        return this.append(async (seq, props) => {
            await func(props);
            await seq.proceed();
        });
    }

    withRequestProperty(name) {
        return this.append(async seq => {
            seq.putResource(name, seq.request[name]);
            await seq.proceed();
        });
    }

    withParameters(type, required, optional = [], json = false) {
        return this.append(async seq => {
            for(const field of required) {
                if(!Object.hasOwnProperty.call(seq.request[type], field)) {
                    seq.terminate(400, { message: `Missing field in ${type}: '${field}'` });
                    return;
                }
                else seq.putResource(field, json ? seq.request[type][field] : convertString(seq.request[type][field]));
            }

            for(const field of optional) {
                if(Object.hasOwnProperty.call(seq.request[type], field))
                    seq.putResource(field, json ? seq.request[type][field] : convertString(seq.request[type][field]));
                else seq.putResource(field, null);
            }
            await seq.proceed();
        });
    }

    withPathParameters(required, optional = []) {
        return this.withParameters('params', required, optional, false);
    }

    withQueryParameters(required, optional = []) {
        return this.withParameters('query', required, optional, false);
    }

    withRequestBody(required, optional = []) {
        return this.withParameters('body', required, optional, true);
    }

    withSession() {
        return this.append(async seq => {
            seq.putResource('session', seq.request.session);
            await seq.proceed();
        });
    }

    authenticate() {
        return this.append(async seq => {
            if(!seq.request.session.loggedIn)
                seq.terminate(401, { message: 'You must be logged in to perform this action' });
            else {
                seq.putResource('userID', seq.request.session.userID);
                await seq.proceed();
            }
        });
    }

    authenticateOrRedirect(route = '/login') {
        return this.append(async seq => {
            if(!seq.request.session.loggedIn) {
                seq.request.session.returnURL = seq.request.originalUrl;
                seq.redirect(302, route);
            }
            else {
                seq.putResource('userID', seq.request.session.userID);
                await seq.proceed();
            }
        });
    }

    redirectIfAuthenticated(route = '/console/home') {
        return this.append(async seq => {
            if(seq.request.session.loggedIn)
                seq.redirect(302, route);
            else await seq.proceed();
        });
    }

    withDatabase(db) {
        return this.append(async seq => {
            seq.putResource('db', db);
            await seq.proceed();
        });
    }

    openConnection() {
        return this.append(async (seq, { db }) => {
            await db.openConnection(async connection => {
                seq.putResource('connection', connection);
                await seq.proceed();
            });
        });
    }

    openTransaction() {
        return this.append(async (seq, { connection }) => {
            const rollbackEvents = [];
            seq.putResource('rollbackEvents', rollbackEvents);
            await connection.transaction(async newConnection => {
                seq.putResource('connection', newConnection);
                await seq.proceed();
            }, async () => {
                for(let i = 0 ; i < rollbackEvents.length ; ++i)
                    await rollbackEvents[rollbackEvents.length - i - 1]();
            });
        });
    }

    withStatic(name, object) {
        return this.append(async seq => {
            for(let field in object)
                if(object.hasOwnProperty(field))
                    seq.putResource(field, object[field]);
            await seq.proceed();
        });
    }

    withDynamic(name, generator) {
        return this.append(async (seq, props) => {
            const result = await generator(props);
            seq.putResource(name, result);
            await seq.proceed();
        });
    }

    entityGenFunction(func, name, entityClass, fields, useDefault, enableQuickFetch = false) {
        return this.append(async (seq, props) => {
            const config = {};
            for(const field of fields)
                config[field] = props[field];
            const entity = new entityClass(config);
            if(enableQuickFetch)
                entity.quickFetch = true;
            if(useDefault)
                entity.useDefault();
            const result = await entity[func](props.connection);
            seq.putResource(name, func === 'create' ? entity : result);
            await seq.proceed();
        });
    }

    createEntity(name, entityClass, fields) {
        return this.entityGenFunction('create', name, entityClass, fields, true);
    }

    withEntity(name, entityClass, fields, enableQuickFetch = false) {
        return this.entityGenFunction('fetchOne', name, entityClass, fields, false, enableQuickFetch);
    }

    withOptionalEntity(name, entityClass, fields, enableQuickFetch = false) {
        return this.entityGenFunction('fetch', name, entityClass, fields, false, enableQuickFetch);
    }

    withAllEntities(name, entityClass, fields, enableQuickFetch = false) {
        return this.entityGenFunction('fetchAll', name, entityClass, fields, false, enableQuickFetch);
    }

    saveEntity(name) {
        return this.append(async (seq, props) => {
            await props[name].save(props.connection);
        });
    }

    deleteEntity(name) {
        return this.append(async (seq, props) => {
            await props[name].delete(props.connection, props.rollbackEvents);
        });
    }

    authorize(resource) {
        return this.append(async (seq, props) => {
            if(props[resource] && typeof props.userID === 'number' && !isNaN(props.userID) && props.userID === props[resource].userID)
                await seq.proceed();
            else seq.terminate(403, { message: 'Access denied to requested resource' });
        });
    }

    withS3Content(name, entity) {
        return this.append(async (seq, props) => {
            seq.putResource(name, await props[entity].fetchContent());
            await seq.proceed();
        });
    }

    saveS3Content(content, entity, stream = false) {
        return this.append(async (seq, props) => {
            if(stream)
                await props[entity].saveContentStream(props[content], props.rollbackEvents);
            else await props[entity].saveContent(props[content], props.rollbackEvents);
            await seq.proceed();
        });
    }

    deleteS3Content(content, entity) {
        return this.append(async (seq, props) => {
            await props[entity].deleteContent(props.rollbackEvents);
            await seq.proceed();
        });
    }

    terminate(code, json = {}) {
        return this.append(seq => {
            seq.terminate(code, json);
        });
    }

    terminateIfExists(name, code, json = {}) {
        return this.append(async (seq, props) => {
            if(props[name] !== undefined && props[name] !== null)
                seq.terminate(code, json);
            else await seq.proceed();
        });
    }

    terminateIfNotExists(name, code, json = {}) {
        return this.append(async (seq, props) => {
            if(props[name] === undefined || props[name] === null)
                seq.terminate(code, json);
            else await seq.proceed();
        });
    }

    render(view, options = {}) {
        return this.append(seq => {
            seq.terminateWithRender(view, options);
        });
    }

    renderIfExists(name, view, options = {}) {
        return this.append(async (seq, props) => {
            if(props[name] !== undefined && props[name] !== null)
                seq.terminateWithRender(view, options);
            else await seq.proceed();
        });
    }

    renderIfNotExists(name, view, options = {}) {
        return this.append(async (seq, props) => {
            if(props[name] === undefined || props[name] === null)
                seq.terminateWithRender(view, options);
            else await seq.proceed();
        });
    }

    sendFile(path) {
        return this.append(seq => {
            seq.terminateWithFile(path);
        });
    }

    sendFileIfExists(name, path) {
        return this.append(async (seq, props) => {
            if(props[name] !== undefined && props[name] !== null)
                seq.terminateWithFile(path);
            else await seq.proceed();
        });
    }

    sendFileIfNotExists(name, path) {
        return this.append(async (seq, props) => {
            if(props[name] === undefined || props[name] === null)
                seq.terminateWithFile(path);
            else await seq.proceed();
        });
    }

    redirect(code, url) {
        return this.append(seq => {
            seq.redirect(code, url);
        });
    }

    redirectIfExists(name, code, url) {
        return this.append(async (seq, props) => {
            if(props[name] !== undefined && props[name] !== null)
                seq.redirect(code, url);
            else await seq.proceed();
        });
    }

    redirectIfNotExists(name, code, url) {
        return this.append(async (seq, props) => {
            if(props[name] === undefined || props[name] === null)
                seq.redirect(code, url);
            else await seq.proceed();
        });
    }

}

class SequenceExecutor {

    static PRELOADED_RESOURCES = Object.freeze({ db, connection: db });

    #response = null;
    #actions = null;

    #executionIndex = -1;
    #terminationAction = null;
    #resources = {};

    constructor(sequence, request, response) {
        this.request = request;
        this.#response = response;
        this.#actions = sequence.actions;
    }

    async execute() {
        if(this.#executionIndex >= 0)
            throw new Error('This sequence executor is busy');

        this.#executionIndex = 0;
        this.#resources = {...SequenceExecutor.PRELOADED_RESOURCES};
        this.#terminationAction = null;

        if(this.#actions.length) {
            try {
                await this.#actions[this.#executionIndex](this, this.#resources);
            }
            catch(err) {
                if(!this.#terminationAction) {
                    if(err instanceof DatabaseError)
                        this.terminate(err.httpStatus(), err.httpMessage());
                    else if(err instanceof ServerError)
                        this.terminate(err.status, err.externalMessage);
                    else if(err instanceof assert.AssertionError)
                        this.terminate(400, { message: 'Request failed server preconditions' })
                    else this.terminate(500, { message: 'An unexpected server fault has occurred' });
                }
                if(err instanceof assert.AssertionError)
                    logger.error(`A precondition failed resulting in HTTP status code 400\n${err.stack}`);
                else if(err.getLog)
                    logger.error(err.getLog());
                else logger.error(`An unexpected server fault has occurred resulting in HTTP status code 500\n${err.stack}`);
            }
        }

        if(this.#terminationAction)
            this.#terminationAction();
        else {
            logger.error('Action sequence was never terminated');
            this.#response.status(500).json({ message: 'An unexpected server fault has occurred' });
        }
        this.#executionIndex = -1;
    }

    ensureNotTerminated() {
        if(this.#terminationAction)
            throw new Error('This action sequence has been terminated');
    }

    isTerminated() {
        return this.#terminationAction;
    }

    async proceed() {
        this.ensureNotTerminated();
        this.#executionIndex++;
        if(this.#executionIndex < this.#actions.length)
            await this.#actions[this.#executionIndex](this, this.#resources);
    }

    terminate(code, json = {}) {
        this.ensureNotTerminated();
        this.#terminationAction = () => this.#response.status(code).json(json);
        logger.info(`Action terminated with code ${code}: ${JSON.stringify(json)}`);
    }

    terminateWithRender(view, options = {}) {
        this.ensureNotTerminated();
        this.#terminationAction = () => this.#response.render(view, options);
        logger.info(`Action terminated with rendering of view '${view}' and options: ${JSON.stringify(options)}`);
    }

    terminateWithFile(path) {
        this.ensureNotTerminated();
        this.#terminationAction = () => this.#response.sendFile(path);
        logger.info(`Action terminated with file: '${path}'`);
    }

    redirect(code, url) {
        this.ensureNotTerminated();
        this.#terminationAction = () => this.#response.redirect(code, url);
        logger.info(`Action terminated with code ${code} and redirection URL '${url}'`);
    }

    putResource(name, resource) {
        this.#resources[name] = resource;
    }

    deleteResource(name) {
        delete this.#resources[name];
    }

}

class ActionResponse {

    constructor(status, json) {
        this.status = status;
        this.json = json;
    }

    ok() {
        return this.status >= 200 && this.status <= 299;
    }

    redirect() {
        return this.status >= 300 && this.status <= 399;
    }

    errorClient() {
        return this.status >= 400 && this.status <= 499;
    }

    errorServer() {
        return this.status >= 500 && this.status <= 599;
    }

    forward(seq) {
        seq.terminate(this.status, this.json);
    }

}

module.exports = ActionSequence;
