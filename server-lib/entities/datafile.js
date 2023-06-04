const { S3Entity } = require('./entity');

class Datafile extends S3Entity {

    constructor({ datasetID, datafileID, filename, labelID = null, customLabel = '', dateAdded = Date.now() }) {
        super(Datafile, process.env.S3_USER_BUCKET, 'datafiles', ['datasetID', 'datafileID'], ['filename', 'labelID', 'customLabel', 'dateAdded']);
        this.datasetID = datasetID;
        this.datafileID = datafileID;
        this.filename = filename;
        this.labelID = labelID;
        this.customLabel = customLabel;
        this.dateAdded = dateAdded;
    }

    genS3Key() {
        return `datafile-${this.datasetID}-${this.datafileID}.data`;
    }

    preconditions() {
        super.assert((this.labelID !== null && this.labelID !== undefined) || (this.customLabel !== null && this.customLabel !== undefined),
            'Datafile must have either a labelID or a custom label');
    }

}

module.exports = Datafile;
