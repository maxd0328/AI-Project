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

    withQueryParameters(required = []) {
        return this.append(async seq => {
            for(const query of required) {
                if(!seq.request.query.hasOwnProperty(query)) {
                    seq.terminate(400, { message: `Missing query parameter: '${query}'` });
                    return;
                }
            }

            seq.putResource('reqQuery', seq.request.query);
            await seq.proceed();
        });
    }

    withRequestBody(required = []) {
        return this.append(async seq => {
            for(const entry of required) {
                if(!seq.request.body.hasOwnProperty(entry)) {
                    seq.terminate(400, { message: `Missing request property: '${entry}'` });
                    return;
                }
            }

            seq.putResource('reqBody', seq.request.body);
            await seq.proceed();
        });
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

    authenticateOrRedirect() {
        return this.append(async seq => {
            if(!seq.request.session.loggedIn) {
                seq.request.session.returnURL = seq.request.originalUrl;
                seq.redirect(302, '/login');
            }
            else {
                seq.putResource('userID', seq.request.session.userID);
                await seq.proceed();
            }
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
            await connection.transaction(async () => {
                await seq.proceed();
            });
        });
    }

    openTransaction() {
        return this.append(async (seq, { db }) => {
            await db.transaction(async connection => {
                seq.putResource('connection', connection);
                await seq.proceed();
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

    withResource(name, generator) {
        return this.append(async (seq, props) => {
            const result = await generator(props);
            seq.putResource(name, result);
            await seq.proceed();
        });
    }

    authorize(resource) {
        return this.append(async (seq, props) => {
            if(props[resource] && typeof props.userID === 'number' && !isNaN(props.userID) && props.userID === props[resource].userID)
                await seq.proceed();
            else seq.terminate(403, { message: 'Access denied to requested resource' });
        });
    }

    terminate(code, json = {}) {
        return this.append(seq => {
            seq.terminate(code, json);
        });
    }

}

class SequenceExecutor {

    static PRELOADED_RESOURCES = Object.freeze({ db });

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

    redirect(code, url) {
        this.ensureNotTerminated();
        this.#response.redirect(code, url);
        this.#terminated = true;
    }

    putResource(name, resource) {
        this.#resources[name] = resource;
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
