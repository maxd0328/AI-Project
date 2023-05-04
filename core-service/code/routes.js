let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});

/* GET login page. */
router.get('/login', function(req, res, next) {
    res.render('login');
});

/* GET register page. */
router.get('/register', function(req, res, next) {
    res.render('register');
});

/* GET home page. */
router.get('/home', function(req, res, next) {
    if(!req.session.loggedIn) {
        res.redirect('/login');
        return;
    }

    res.render('home', {firstName: req.session.firstName});
});

module.exports = router;
