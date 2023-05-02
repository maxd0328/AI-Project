let express = require('express');
let app = express();

app.use('/users', require('./routes/users'));

module.exports = app;
