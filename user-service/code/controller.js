const db = require('../commons/database');
const { v4: uuidv4 } = require('uuid');
const middleware = require('../commons/middleware');
const aws = require('../commons/aws');

function enterSession(session, user) {
    session.loggedIn = true;
    session.userID = user.userID;
    session.firstName = user.firstName;
}

async function addUser(email, firstName, lastName, phoneNumber, password) {
    const query = `INSERT INTO users (email, firstName, lastName, phoneNumber, password) VALUES (?, ?, ?, ?, ?)`;
    const values = [email, firstName, lastName, phoneNumber, password];

    await db.query(query, values);

    const [rows] = await db.query(`SELECT LAST_INSERT_ID() as id`);
    return rows[0].id;
}

async function authenticateUser(email, password) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const values = [email];

    const [rows] = await db.query(query, values);
    console.log(JSON.stringify(rows));
    if(rows.length !== 1 || rows[0].email !== email || rows[0].password !== password)
        throw { code: 'AUTH_FAIL', message: 'Email and password do not match' };
    else return rows[0];
}

async function fetchUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const values = [email];

    const [rows] = await db.query(query, values);
    return rows.length > 0 ? rows[0] : undefined;
}

async function fetchUserByID(userID) {
    const query = 'SELECT * FROM users WHERE userID = ?';
    const values = [userID];

    const [rows] = await db.query(query, values);
    return rows.length > 0 ? rows[0] : undefined;
}

async function sendResetPasswordToken(user) {
    const uuid = uuidv4();

    const tokenKey = `passwordResetToken:${uuid}`;
    const token = user.userID;
    const expiry = 60 * 60; // 1 hour

    middleware.redisClient.set(tokenKey, token, 'EX', expiry);

    const message = 'Greetings,\n\nFollow this link to reset your password:\n\n';
    const link = `http://ai-project-web.us-east-1.elasticbeanstalk.com/user/reset-password?token=${uuid}`;
    const closure = '\n\nKind regards,\nThe GrAI Matter Team';
    await aws.sendEmail([user.email], 'Reset Password', message + link + closure);
}

/* Returns user row of associated user if token is valid */
async function validateResetPasswordToken(token, remove) {
    const tokenKey = `passwordResetToken:${token}`;
    const userID = await middleware.redisClient.get(tokenKey);

    if(userID !== null) {
        if(remove)
            await middleware.redisClient.del(tokenKey);

        return fetchUserByID(userID);
    }
    else return null;
}

async function updateUserPassword(user, password) {
    const query = `UPDATE users SET password = ? WHERE userID = ?`;
    const values = [password, user.userID];
    await db.query(query, values);

    user.password = password;
}

module.exports = {
    enterSession,
    addUser,
    authenticateUser,
    fetchUserByEmail,
    fetchUserByID,
    sendResetPasswordToken,
    validateResetPasswordToken,
    updateUserPassword
};
