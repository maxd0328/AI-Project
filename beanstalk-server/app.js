const express = require('express');
const app = express();
const port = process.env.PORT || 80;

app.get('/', (req, res) => {
    console.log('Request: ' + req);
    res.send('Hello world!');
});

app.get('/hello', (req, res) => {
    res.json({message: 'Hello World'})
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

module.exports = app;
