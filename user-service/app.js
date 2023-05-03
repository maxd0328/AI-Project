let express = require('express');
let app = express();

app.use('/users', require('./code/routes'));

module.exports = app;
