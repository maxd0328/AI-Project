const router = require('express').Router();
const path = require('path');
const { ActionSequence } = require('server-lib').utils;

/* GET home page. */
router.get('/', new ActionSequence().render('index').export());

/* GET login page. */
router.get('/login', new ActionSequence().redirectIfAuthenticated().render('login').export());

/* GET register page. */
router.get('/register', new ActionSequence().redirectIfAuthenticated().render('register').export());

/* GET forgot password page. */
router.get('/forgot-password', new ActionSequence()
    .redirectIfAuthenticated()
    .withQueryParameters([], ['submitted', 'email'])
    .append((seq, { submitted, email }) => seq.terminateWithRender(submitted === 'true', email || ''))
    .export());

/* GET react client routes. */
const serveApp = new ActionSequence().authenticateOrRedirect().sendFile(path.join(__dirname, '../public/console/index.html')).export();

router.get('/console', new ActionSequence().redirect(301, '/console/home').export());
router.get('/console/index.html', new ActionSequence().redirect(301, '/console/home').export());
router.get('/console/home', serveApp);
router.get('/console/scripts', serveApp);
router.get('/console/project', serveApp);
router.get('/console/presets', serveApp);
router.get('/console/datasets', serveApp);

module.exports = router;
