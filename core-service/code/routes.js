let express = require('express');
let path = require('path');
let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    if(req.session.loggedIn)
        res.redirect('/console/home');
    else res.render('index');
});

/* GET login page. */
router.get('/login', function(req, res, next) {
    if(req.session.loggedIn)
        res.redirect('/console/home');
    else res.render('login');
});

/* GET register page. */
router.get('/register', function(req, res, next) {
    if(req.session.loggedIn)
        res.redirect('/console/home');
    else res.render('register');
});

/* GET forgot password page. */
router.get('/forgot-password', function(req, res, next) {
    if(req.session.loggedIn)
        res.redirect('/console/home');
    else res.render('forgot-password', { submitted: req.query.submitted==='true', email: req.query.email ? req.query.email : '' });
});

/* GET react client routes. */
function serveApp(req, res, next) {
    if(!req.session.loggedIn)
        res.redirect('/login');
    else res.sendFile(path.join(__dirname, '../public/console/index.html'));
}
router.get('/console/home', serveApp);
router.get('/console/scripts', serveApp);

module.exports = router;
