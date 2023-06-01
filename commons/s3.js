const aws = require('./aws').aws;

const s3 = process.env.NODE_ENV !== 'development' ? new aws.S3()
    : new aws.S3({
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        endpoint: process.env.S3_ENDPOINT,
        s3ForcePathStyle: true
    });

async function ensureBucketExists(bucket) {
    s3.headBucket({ Bucket: bucket }, (err, data) => {
        if(err && err.code === 'NotFound') {
            s3.createBucket({ Bucket: bucket }, (err, data) => {
                if(err)
                    console.error(`Error creating bucket ${bucket}.`, err);
            });
        }
        else if(err)
            console.error(`Error verifying bucket ${bucket}.`, err);
    });
}

async function getResource(bucket, filename, callback) {
    const params = {
        Bucket: bucket,
        Key: filename,
    };

    try {
        const data = await s3.getObject(params).promise();
        const body = data.Body.toString();

        if(callback)
            callback(null, body);

        return body;
    }
    catch(err) {
        if(callback)
            callback(err);
        else throw err;
    }
}

async function putResource(bucket, filename, body, callback) {
    const params = {
        Bucket: bucket,
        Key: filename,
        Body: body
    };

    try {
        const data = await s3.putObject(params).promise();
        const location = data.Location;

        if(callback)
            callback(null, location);

        return location;
    }
    catch(err) {
        if(callback)
            callback(err);
        else throw err;
    }
}

/* Callback only for err */
async function deleteResource(bucket, filename, callback) {
    const params = {
        Bucket: bucket,
        Key: filename
    };

    try {
        await s3.deleteObject(params).promise();
    }
    catch(err) {
        if(callback)
            callback(err);
        else throw err;
    }
}

async function getPresignedURL(bucket, filename, expiry = 60 * 60) { // default 1 hour expiry
    const params = {
        Bucket: bucket,
        Key: filename,
        Expires: expiry
    };

    return new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', params, (err, url) => {
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

ensureBucketExists(process.env.S3_USER_BUCKET).then(() => {});

module.exports = {
    ensureBucketExists,
    getResource,
    putResource,
    deleteResource,
    getPresignedURL
}
