const express = require('express');
const middleware = require('./commons/middleware');
const app = express();

middleware.basic(app);
middleware.views(app);
middleware.session(app);
middleware.error(app);

app.use('/user', require('./code/routes'));

module.exports = app;
