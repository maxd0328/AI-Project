const aws = require('./aws').aws;

const s3 = process.env.NODE_ENV !== 'development' ? new aws.S3()
    : new aws.S3({
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        endpoint: process.env.S3_ENDPOINT,
        s3ForcePathStyle: true
    });

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

module.exports = {
    getResource,
    putResource
}
