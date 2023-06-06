const aws = require('aws-sdk');
const {Readable} = require("stream");

class SESClient {

    constructor({ apiVersion }) {
        this.client = new aws.SES({ apiVersion });
    }

    async sendEmail(recipients, subject, message) {
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

        return await this.client.sendEmail(params).promise();
    }

}

class S3Client {

    constructor({ accessKeyId, secretAccessKey, endpoint }) {
        this.client = process.env.NODE_ENV !== 'development' ? new aws.S3()
            : new aws.S3({
                accessKeyId,
                secretAccessKey,
                endpoint,
                s3ForcePathStyle: true
            });
    }

    async ensureBucketExists(bucket) {
        const client = this.client;

        client.headBucket({ Bucket: bucket }, (err, data) => { // TODO this is a bit messy, and doesn't throw any errors, only logs
            if(err && err.code === 'NotFound') {
                client.createBucket({ Bucket: bucket }, (err, data) => {
                    if(err)
                        console.error(`Error creating bucket ${bucket}.`, err);
                });
            }
            else if(err)
                console.error(`Error verifying bucket ${bucket}.`, err);
        });
    }

    async resourceExists(bucket, filename) {
        const params = {
            Bucket: bucket,
            Key: filename
        };

        try {
            await this.client.headObject(params).promise();
            return true;
        }
        catch(err) {
            if(err.code === 'NotFound')
                return false;

            throw err;
        }
    }

    async getResource(bucket, filename) {
        const params = {
            Bucket: bucket,
            Key: filename,
        };

        const data = await this.client.getObject(params).promise();
        const body = data.Body.toString();

        return body;
    }

    async putResource(bucket, filename, body) {
        const params = {
            Bucket: bucket,
            Key: filename,
            Body: body
        };

        const data = await this.client.putObject(params).promise();
        const location = data.Location;

        return location;
    }

    async putResourceStream(bucket, filename, streamCallback) {
        const upload = this.client.upload({
            Bucket: bucket,
            Key: filename,
            Body: new Readable({
                read() {
                    return streamCallback(this);
                }
            })
        });

        const data = await upload.response();
        const location = data.Location;

        return location;
    }

    /* Callback only for err */
    async deleteResource(bucket, filename) {
        const params = {
            Bucket: bucket,
            Key: filename
        };

        await this.client.deleteObject(params).promise();
    }

    async createPresignedURL(bucket, filename, expiry = 60 * 60) { // default 1 hour expiry
        const params = {
            Bucket: bucket,
            Key: filename,
            Expires: expiry
        };

        return new Promise((resolve, reject) => {
            this.client.getSignedUrl('getObject', params, (err, url) => {
                if(err)
                    reject(err);
                else {
                    if(process.env.NODE_ENV === 'development') // Development server only (use the exposed URL, not the internal one)
                        url = url.replace('minio', 'localhost');

                    resolve(url);
                }
            });
        });
    }

}

class AWSClient {

    static initialize({ accessKeyId, secretAccessKey, region }) {
        aws.config.update({
            accessKeyId,
            secretAccessKey,
            region
        });
    }

    constructor({ sesApiVersion, s3AccessKeyId, s3SecretAccessKey, s3Endpoint }) {
        this.ses = new SESClient({ sesApiVersion });
        this.s3 = new S3Client({ s3AccessKeyId, s3SecretAccessKey, s3Endpoint });
    }

}

module.exports = {
    SESClient,
    S3Client,
    AWSClient
};
