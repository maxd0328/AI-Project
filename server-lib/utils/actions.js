const { db, logger } = require('../instance/services');
const { DatabaseError } = require('./database');
const { ServerError } = require('./error');

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
            func(props);
            await seq.proceed();
        });
    }

    withParameters(type, required, optional = []) {
        return this.append(async seq => {
            for(const field of required) {
                if(!seq.request[type].hasOwnProperty(field)) {
                    seq.terminate(400, { message: `Missing field in ${type}: '${field}'` });
                    return;
                }
                else seq.putResource(field, seq.request[type][field]);
            }

            for(const field of optional) {
                if(seq.request[type].hasOwnProperty(field))
                    seq.putResource(field, seq.request[type][field]);
                else seq.putResource(field, null);
            }
            await seq.proceed();
        });
    }

    withPathParameters(required, optional = []) {
        return this.withParameters('params', required, optional);
    }

    withQueryParameters(required, optional = []) {
        return this.withParameters('query', required, optional);
    }

    withRequestBody(required, optional = []) {
        return this.withParameters('body', required, optional);
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

    transaction() {
        return this.append(async (seq, { connection }) => {
            const rollbackEvents = [];
            seq.putResource('rollbackEvents', rollbackEvents);
            await connection.transaction(async () => {
                await seq.proceed();
            }, async () => {
                for(const event of rollbackEvents)
                    await event();
            });
        });
    }

    openTransaction() {
        return this.append(async (seq, { db }) => {
            const rollbackEvents = [];
            seq.putResource('rollbackEvents', rollbackEvents);
            await db.transaction(async connection => {
                seq.putResource('connection', connection);
                await seq.proceed();
            }, async () => {
                for(const event of rollbackEvents)
                    await event();
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

    entityFunction(func, name, entityClass, fields) {
        return this.append(async (seq, props) => {
            const config = {};
            for(const field of fields)
                config[field] = props[field];
            const entity = await new entityClass(config)[func](props.connection);
            seq.putResource(name, entity);
        });
    }

    createEntity(name, entityClass, fields) {
        return this.entityFunction('create', name, entityClass, fields);
    }

    withEntity(name, entityClass, fields) {
        return this.entityFunction('fetchOne', name, entityClass, fields);
    }

    withOptionalEntity(name, entityClass, fields) {
        return this.entityFunction('fetch', name, entityClass, fields);
    }

    withAllEntities(name, entityClass, fields) {
        return this.entityFunction('fetchAll', name, entityClass, fields);
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

    createS3Content(content, entity, stream = false) {
        return this.append(async (seq, props) => {
            if(stream)
                await props[entity].saveContentStream(props[content]);
            else await props[entity].saveContent(props[content]);
            if(props.rollbackEvents)
                props.rollbackEvents.push(async () => await props[entity].deleteContent());
            await seq.proceed();
        });
    }

    saveS3Content(content, entity, stream = false) {
        return this.append(async (seq, props) => {
            const backup = props.rollbackEvents ? await props[entity].fetchContent() : null;
            if(stream)
                await props[entity].saveContentStream(props[content]);
            else await props[entity].saveContent(props[content]);
            if(props.rollbackEvents)
                props.rollbackEvents.push(async () => await props[entity].saveContent(backup));
            await seq.proceed();
        });
    }

    terminate(code, json = {}) {
        return this.append(seq => {
            seq.terminate(code, json);
        });
    }

    render(view, options = {}) {
        return this.append(seq => {
            seq.terminateWithRender(view, options);
        });
    }

    sendFile(path) {
        return this.append(seq => {
            seq.terminateWithFile(path);
        });
    }

    redirect(code, url) {
        return this.append(seq => {
            seq.redirect(code, url);
        });
    }

}

class SequenceExecutor {

    static PRELOADED_RESOURCES = Object.freeze({ db, connection: db });

    #response = null;
    #actions = null;

    #executionIndex = -1;
    #terminated = false;
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
        this.#terminated = false;

        if(this.#actions.length) {
            try {
                await this.#actions[this.#executionIndex](this, this.#resources);
            }
            catch(err) {
                if(!this.#terminated) {
                    if(err instanceof DatabaseError)
                        this.terminate(err.httpStatus(), err.httpMessage());
                    else if(err instanceof ServerError)
                        this.terminate(err.status, err.externalMessage);
                    else this.terminate(500, { message: 'An unexpected server fault has occurred' });
                }
                if(err.getLog)
                    logger.error(err.getLog());
                else logger.error(`An unexpected server fault has occurred resulting in HTTP status code 500\n${err.stack}`);
            }
        }

        if(!this.#terminated)
            throw new Error('Action sequence was never terminated');
        this.#executionIndex = -1;
    }

    ensureNotTerminated() {
        if(this.#terminated)
            throw new Error('This action sequence has been terminated');
    }

    async proceed() {
        this.ensureNotTerminated();
        this.#executionIndex++;
        if(this.#executionIndex < this.#actions.length)
            await this.#actions[this.#executionIndex](this, this.#resources);
    }

    terminate(code, json = {}) {
        this.ensureNotTerminated();
        this.#response.status(code).json(json);
        this.#terminated = true;
    }

    terminateWithRender(view, options = {}) {
        this.ensureNotTerminated();
        this.#response.render(view, options);
        this.#terminated = true;
    }

    terminateWithFile(path) {
        this.ensureNotTerminated();
        this.#response.sendFile(path);
        this.#terminated = true;
    }

    redirect(code, url) {
        this.ensureNotTerminated();
        this.#response.redirect(code, url);
        this.#terminated = true;
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
