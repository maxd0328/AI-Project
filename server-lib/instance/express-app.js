const { MiddlewareRepository } = require('../utils/middleware');

/**
 * Express app origin
 */

const express = require('express');

function createExpressApp(...middleware) {
    const app = express();
    MiddlewareRepository.basic('dev').apply(app);

    for(let i = 0 ; i < middleware.length ; ++i)
        middleware[i].apply(app);

    MiddlewareRepository.errorHandler().apply(app);
}

module.exports = createExpressApp;
