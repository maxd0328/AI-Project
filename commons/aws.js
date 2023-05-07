const aws = require('aws-sdk');

aws.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const ses = new aws.SES({ apiVersion: '2010-12-01' });

async function sendEmail(recipients, subject, message) {
    const params = {
        Destination: {
            ToAddresses: recipients
        },
        Message: {
            Body: {
                Text: {
                    Charset: 'UTF-8',
                    Data: message
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject
            }
        },
        Source: process.env.NOREPLY_EMAIL_ADDRESS
    };

    try {
        const result = await ses.sendEmail(params).promise();
    }
    catch(err) {
        // TODO
    }
}

module.exports = {
    sendEmail
};
