let express = require('express');
let app = express();

app.use('/', require('./routes/index'));

module.exports = app;
