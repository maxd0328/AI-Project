const { S3Entity } = require('./entity');

class Script extends S3Entity {

    constructor({ scriptID, userID, name, lastModified = Date.now() }) {
        super(Script, process.env.S3_USER_BUCKET, 'scripts', ['scriptID'], ['userID', 'name', 'lastModified'], true);
        this.scriptID = scriptID;
        this.userID = userID;
        this.name = name;
        this.lastModified = lastModified;
    }

    genS3Key() {
        return `script-${this.scriptID}.matej`;
    }

}

module.exports = Script;
