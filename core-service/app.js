let express = require('express');
let app = express();

app.use('/', require('./code/routes'));

module.exports = app;
