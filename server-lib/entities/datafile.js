const { S3Entity } = require('./entity');

class Datafile extends S3Entity {

    constructor({ datasetID, datafileID, filename, labelID, customLabel, dateAdded }) {
        super(Datafile, process.env.S3_USER_BUCKET, 'datafiles', ['datasetID', 'datafileID'], ['filename', 'labelID', 'customLabel', 'dateAdded']);
        super.setOrdering('dateAdded', false);
        this.datasetID = datasetID;
        this.datafileID = datafileID;
        this.filename = filename;
        this.labelID = labelID;
        this.customLabel = customLabel;
        this.dateAdded = dateAdded;
    }

    defaultParams() {
        return { filename: '[no name]', labelID: null, customLabel: '', dateAdded: Date.now() };
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
