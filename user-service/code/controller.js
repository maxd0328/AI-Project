const { v4: uuidv4 } = require('uuid');
const { redisClient, aws } = require('server-lib').services;

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

module.exports = {
    sendResetPasswordToken,
    validateResetPasswordToken
};
