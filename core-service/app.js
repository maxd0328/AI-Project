const express = require('express');
const middleware = require('./commons/middleware');
const app = express();

middleware.basic(app);
middleware.views(app);
middleware.directory(app);
middleware.session(app);
middleware.error(app);

app.use((req, res, next) => {
    if(req.path === '/console' || req.path === '/console/index.html')
        res.redirect('/console/home');

    else next();
});
app.use('/', require('./code/routes'));

module.exports = app;
