const express = require('express');
const controller = require('./controller');
const router = express.Router();

/* POST create new user. */
router.post('/create', async function(req, res, next) {
    const firstName = req.body['first-name'];
    const lastName = req.body['last-name'];
    const email = req.body['email'];
    const phoneNumber = req.body['phone-number'];
    const password = req.body['password'];

    try {
        const userID = await controller.addUser(email, firstName, lastName, phoneNumber, password);
        controller.enterSession(req.session, { userID, email: email, firstName: firstName,
            lastName: lastName, phoneNumber: phoneNumber, password: password });
        res.redirect('/home');
    }
    catch(err) {
        // TODO
        console.log(JSON.stringify(err));
        res.redirect('/register');
    }
});

/* POST login request. */
router.post('/login', async function(req, res, next) {
    const email = req.body['email'];
    const password = req.body['password'];

    try {
        const userRow = await controller.authenticateUser(email, password);
        controller.enterSession(req.session, userRow);
        res.redirect('/home');
    }
    catch(err) {
        // TODO
        console.log(JSON.stringify(err));
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

/* POST forgot password request. */
router.post('/forgot-password', async function(req, res, next) {
    const email = req.body['email'];

    try {
        const user = controller.fetchUserByEmail(email);
        if(user) {
            await controller.sendResetPasswordToken(user);
            res.redirect(`/forgot-password?submitted=true&email=${email}`);
        }
        else {
            // TODO
            res.redirect('/forgot-password');
        }
    }
    catch(err) {
        // TODO
        res.redirect('/forgot-password');
    }
});

/* GET reset password page. */
router.get('/reset-password', async function(req, res, next) {
    try {
        const user = await controller.validateResetPasswordToken(req.query.token, false);
        if(user) res.render('reset-password', { email: user.email, token: req.query.token });
        else res.render('invalid-token');
    }
    catch(err) {
        res.render('invalid-token');
    }
});

/* POST reset password request. */
router.post('/reset-password', async function(req, res, next) {
    const password = req.body['password'];
    const token = req.body['token'];

    try {
        const user = await controller.validateResetPasswordToken(token, true);
        if(user) {
            await controller.updateUserPassword(user, password);
            controller.enterSession(req.session, user);
            res.redirect('/home');
        }
        else {
            // TODO
            res.redirect(`/user/reset-password?token=${token}`);
        }
    }
    catch(err) {
        // TODO
        res.redirect(`/user/reset-password?token=${token}`);
    }
});

module.exports = router;
