
class ServerError extends Error {

    constructor(status, externalMessage, internalMessage) {
        super(internalMessage || externalMessage);
        this.status = status;
        this.externalMessage = externalMessage;
    }

    clientError() {
        return this.status >= 400 && this.status <= 499;
    }

    serverError() {
        return this.status >= 500 && this.status <= 599;
    }

    toString() {
        return `Server Error '${this.code}' (SQL: ${this.sqlcode}): ${this.message}`;
    }

    getLog() {
        return `A server error has occurred resulting in HTTP status code ${this.status}
        ${this.stack}`;
    }

}

module.exports = ServerError;
