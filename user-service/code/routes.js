const router = require('express').Router();
const controller = require('./controller');
const { ActionSequence, Assertions } = require('server-lib').utils;
const { User } = require('server-lib').entities;

/* GET user info. */
router.get('/', new ActionSequence()
    .authenticateOrRedirect()
    .withSession()
    .append((seq, { session }) => seq.terminate(200, { firstName: session.firstName }))
    .export()
);

/* POST create new user. */
router.post('/', new ActionSequence()
    .withRequestBody(['firstName', 'lastName', 'email', 'phoneNumber', 'password'])
    .assert(Assertions.isString().isNotEmpty(), 'firstName', 'lastName', 'email', 'phoneNumber', 'password')
    .withSession()
    .createEntity('user', User, ['firstName', 'lastName', 'email', 'phoneNumber', 'password'])
    .intermediate(({ user, session }) => user.makeCurrent(session))
    .redirect(302, '/console/home')
    .export()
);

/* POST log in. */
router.post('/login', new ActionSequence()
    .withRequestBody(['email', 'password'])
    .assert(Assertions.isString().isNotEmpty(), 'email', 'password')
    .withSession()
    .withOptionalEntity('user', User, ['email', 'password'])
    .terminateIfNotExists('user', 401, { message: 'Invalid email/password' })
    .intermediate(({ user, session }) => user.makeCurrent(session))
    .redirect(302, '/console/home')
    .export()
);

/* POST log out. */
router.post('/logout', new ActionSequence()
    .withSession()
    .intermediate(async ({ session }) => await session.destroy())
    .redirect(302, '/')
    .export()
);

/* POST submit forgot password. */
router.post('/forgot-password', new ActionSequence()
    .withRequestBody(['email'])
    .assert(Assertions.isString().isNotEmpty(), 'email')
    .withEntity('user', User, ['email'])
    .append(async (seq, { email, user }) => {
        await controller.sendResetPasswordToken(user);
        seq.redirect(302, `/forgot-password?submitted=true&email=${email}`);
    })
    .export()
);

/* GET reset password page. */
router.get('/reset-password', new ActionSequence()
    .withQueryParameters([], ['token'])
    .withDynamic('userID', async ({ token }) => await controller.validateResetPasswordToken(token, false))
    .renderIfNotExists('userID', 'invalid-token')
    .withEntity('user', User, ['userID'])
    .append((seq, { user, token }) => seq.render('reset-password', { email: user.email, token }))
    .export()
);

/* POST submit password reset. */
router.post('/reset-password', new ActionSequence()
    .withRequestBody(['password', 'token'])
    .withDynamic('userID', async ({ token }) => await controller.validateResetPasswordToken(token, true))
    .terminateIfNotExists('userID', 401, { message: 'Invalid token' })
    .withEntity('user', User, ['userID'])
    .intermediate(({ user, password }) => user.password = password)
    .saveEntity('user')
    .redirect(302, '/console/home')
    .export()
);

module.exports = router;
