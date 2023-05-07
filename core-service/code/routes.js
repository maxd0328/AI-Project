let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    if(req.session.loggedIn)
        res.redirect('/home');
    else res.render('index');
});

/* GET login page. */
router.get('/login', function(req, res, next) {
    if(req.session.loggedIn)
        res.redirect('/home');
    else res.render('login');
});

/* GET register page. */
router.get('/register', function(req, res, next) {
    if(req.session.loggedIn)
        res.redirect('/home');
    else res.render('register');
});

/* GET forgot password page. */
router.get('/forgot-password', function(req, res, next) {
    if(req.session.loggedIn)
        res.redirect('/home');
    else res.render('forgot-password', { submitted: req.query.submitted==='true', email: req.query.email ? req.query.email : '' });
});

/* GET home page. */
router.get('/home', function(req, res, next) {
    if(!req.session.loggedIn)
        res.redirect('/login');
    else res.render('home', {firstName: req.session.firstName});
});

module.exports = router;
