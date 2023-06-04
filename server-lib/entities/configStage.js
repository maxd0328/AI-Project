const { S3Entity } = require('./entity');

class ConfigStage extends S3Entity {

    static STAGE_TYPES = Object.freeze(['int', 'ext', 'gen']);

    constructor({ projectID, location, name, type, scriptID }) {
        super(ConfigStage, process.env.S3_USER_BUCKET, 'configs', ['projectID', 'location'], ['name', 'type', 'scriptID']);
        this.projectID = projectID;
        this.location = location;
        this.name = name;
        this.type = type;
        this.scriptID = scriptID;
    }

    genS3Key() {
        return `config-${this.projectID}-${this.location}.matej`;
    }

    preconditions() {
        super.assert(ConfigStage.STAGE_TYPES.includes(this.type), 'Config stage type must be one of the following: ' + ConfigStage.STAGE_TYPES.join(', '));
        super.assert(this.scriptID === null || this.type === 'ext', 'A config stage can only have a script ID if its type is \'ext\'');
    }

    preconditionsS3() {
        super.assert(this.type !== 'ext', 'An external config stage does not have an S3 key');
    }

}

module.exports = ConfigStage;
