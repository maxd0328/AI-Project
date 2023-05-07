const express = require('express');
const middleware = require('commons/middleware');
const app = express();

middleware.basic(app);
middleware.session(app);
middleware.error(app);

module.exports = app;
