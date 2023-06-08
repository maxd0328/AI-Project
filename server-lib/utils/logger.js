const winston = require('winston');
const path = require('path');

const logFormat = winston.format.printf(({ level, message, timestamp, service }) => {
    return `[${timestamp}] ${service} ${level.toUpperCase()}: ${message}`;
});

class Logger {

    constructor(serviceName, logPath) {
        const transports = process.env.NODE_ENV === 'development' ? [new winston.transports.Console()] : [
            new winston.transports.File({ filename: path.join(logPath, 'error.log'), level: 'error' }),
            new winston.transports.File({ filename: path.join(logPath, 'events.log')})
        ];

        this.internal = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.colorize(),
                winston.format.json(),
                logFormat
            ),
            transports
        });

        this.serviceName = serviceName;
    }

    info(message) {
        this.internal.info({ message, service: this.serviceName });
    }

    warn(message) {
        this.internal.warn({ message, service: this.serviceName });
    }

    error(message) {
        this.internal.error({ message, service: this.serviceName });
    }

}

module.exports = Logger;
