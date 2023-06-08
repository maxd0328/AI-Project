const router = require('express').Router();
const { ActionSequence, Assertions } = require('server-lib').utils;
const { redisClient, aws } = require('server-lib').services;
const { User } = require('server-lib').entities;
const { v4: uuidv4 } = require('uuid');

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
    .redirectIfNotExists('user', 302, '/login')
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
        await sendResetPasswordToken(user);
        seq.redirect(302, `/forgot-password?submitted=true&email=${email}`);
    })
    .export()
);

/* GET reset password page. */
router.get('/reset-password', new ActionSequence()
    .withQueryParameters([], ['token'])
    .withDynamic('userID', async ({ token }) => await validateResetPasswordToken(token, false))
    .renderIfNotExists('userID', 'invalid-token')
    .withEntity('user', User, ['userID'])
    .append((seq, { user, token }) => seq.render('reset-password', { email: user.email, token }))
    .export()
);

/* POST submit password reset. */
router.post('/reset-password', new ActionSequence()
    .withRequestBody(['password', 'token'])
    .withDynamic('userID', async ({ token }) => await validateResetPasswordToken(token, true))
    .terminateIfNotExists('userID', 401, { message: 'Invalid token' })
    .withEntity('user', User, ['userID'])
    .intermediate(({ user, password }) => user.password = password)
    .saveEntity('user')
    .redirect(302, '/console/home')
    .export()
);

async function sendResetPasswordToken(user) {
    const uuid = uuidv4();

    const tokenKey = `passwordResetToken:${uuid}`;
    const token = user.userID;
    const expiry = 60 * 60; // 1 hour

    redisClient.set(tokenKey, token, 'EX', expiry);

    const message = 'Greetings,\n\nFollow this link to reset your password:\n\n';
    const link = `http://ai-project-web.us-east-1.elasticbeanstalk.com/user/reset-password?token=${uuid}`;
    const closure = '\n\nKind regards,\nThe AxoModel Team';
    await aws.ses.sendEmail([user.email], 'Reset Password', message + link + closure);
}

/* Returns user row of associated user if token is valid */
async function validateResetPasswordToken(token, remove) {
    const tokenKey = `passwordResetToken:${token}`;
    const userID = await redisClient.get(tokenKey);

    if(userID !== null) {
        if(remove)
            await redisClient.del(tokenKey);

        return userID;
    }
    else return null;
}

module.exports = router;
