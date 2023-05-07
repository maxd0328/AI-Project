const db = require('./database');
const { v4: uuidv4 } = require('uuid');
const middleware = require('../commons/middleware');
const aws = require('../commons/aws');

function enterSession(session, user) {
    session.loggedIn = true;
    session.email = user.email;
    session.firstName = user.firstName;
}

async function addUser(email, firstName, lastName, phoneNumber, password) {
    const query = `INSERT INTO users (email, firstName, lastName, phoneNumber, password) VALUES (?, ?, ?, ?, ?)`;
    const values = [email, firstName, lastName, phoneNumber, password];

    await db.query(query, values);
}

async function authenticateUser(email, password) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const values = [email];

    const [rows] = await db.query(query, values);
    if(rows.length !== 1 || rows[0].email !== email || rows[0].password !== password)
        throw { code: 'AUTH_FAIL', message: 'Email and password do not match' };
    else return rows[0];
}

async function userExists(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const values = [email];

    const [rows] = await db.query(query, values);
    return rows.length === 1;
}

async function sendResetPasswordToken(email) {
    const uuid = uuidv4();

    const tokenKey = `passwordResetToken:${uuid}`;
    const token = email;
    const expiry = 60 * 60; // 1 hour

    middleware.redisClient.set(tokenKey, token, 'EX', expiry);

    const message = 'Greetings,\n\nFollow this link to reset your password:\n\n';
    const link = `http://ai-project-web.us-east-1.elasticbeanstalk.com/user/reset-password?token=${uuid}`;
    const closure = '\n\nKind regards,\nThe GrAI Matter Team';
    await aws.sendEmail([email], 'Reset Password', message + link + closure);
}

async function validateResetPasswordToken(token, remove) {
    const tokenKey = `passwordResetToken:${token}`;
    const email = await middleware.redisClient.get(tokenKey);

    if(email) {
        if(remove)
            await middleware.redisClient.del(tokenKey);

        return email;
    }
    else return null;
}

async function updateUserPassword(email, password) {
    let query = `UPDATE users SET password = ? WHERE email = ?`;
    let values = [password, email];
    await db.query(query, values);

    query = `SELECT * FROM users WHERE email = ?`;
    values = [email];
    const [rows] = await db.query(query, values);
    return rows[0];
}

module.exports = {
    enterSession,
    addUser,
    authenticateUser,
    userExists,
    sendResetPasswordToken,
    validateResetPasswordToken,
    updateUserPassword
};
