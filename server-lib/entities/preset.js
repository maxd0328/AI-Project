const { S3Entity } = require('./entity');

class Preset extends S3Entity {

    constructor({ presetID, name, description }) {
        super(Preset, process.env.S3_USER_BUCKET, 'presets', ['presetID'], ['name', 'description'], true);
        this.presetID = presetID;
        this.name = name;
        this.description = description;
    }

    defaultParams() {
        return { name: 'New Preset', description: '' };
    }

    genS3Key() {
        return `preset-${this.presetID}.matej`;
    }

}

module.exports = Preset;
