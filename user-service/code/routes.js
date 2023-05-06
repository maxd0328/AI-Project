let express = require('express');
let controller = require('./controller');
let router = express.Router();

/* POST create new user. */
router.post('/create', async function(req, res, next) {
    const firstName = req.body['first-name'];
    const lastName = req.body['last-name'];
    const email = req.body['email'];
    const phoneNumber = req.body['phone-number'];
    const password = req.body['password'];

    try {
        await controller.addUser(email, firstName, lastName, phoneNumber, password);
        req.session.loggedIn = true;
        req.session.email = email;
        req.session.firstName = firstName;
        res.redirect('/home');
    }
    catch(err) {
        // TODO
        res.redirect('/register');
    }
});

/* POST login request. */
router.post('/login', async function(req, res, next) {
    const email = req.body['email'];
    const password = req.body['password'];

    try {
        const userRow = await controller.authenticateUser(email, password);
        req.session.loggedIn = true;
        req.session.email = userRow.email;
        req.session.firstName = userRow.firstName;
        res.redirect('/home');
    }
    catch(err) {
        // TODO
        res.redirect('/login');
    }
});

/* GET logout request. */
router.get('/logout', async function(req, res, next) {
    req.session.destroy((err) => {
        if(!err)
            res.redirect('/');
    })
});

module.exports = router;
