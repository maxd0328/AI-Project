let express = require('express');
let app = express();

app.use('/user', require('./code/routes'));

module.exports = app;
