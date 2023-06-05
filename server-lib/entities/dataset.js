const { Entity } = require('./entity');
const Datafile = require('./datafile');
const { db } = require('../instance/services');

class DataLabel {

    constructor({ labelID, string }) {
        this.labelID = labelID;
        this.string = string;
    }

}

class Dataset extends Entity {

    constructor({ datasetID, userID, name, nextLabel = 1, nextFile = 1, lastModified = Date.now(), labels = [] }) {
        super(Dataset, 'datasets', ['datasetID'], ['userID', 'name', 'lastModified'], true);
        this.datasetID = datasetID;
        this.userID = userID;
        this.name = name;
        this.nextLabel = nextLabel;
        this.nextFile = nextFile;
        this.lastModified = lastModified;
        this.labels = labels;

        let maxLabelID = Math.max.apply(Math, this.labels);
        if(maxLabelID >= this.nextLabel)
            this.nextLabel = maxLabelID + 1;

        for(let label of this.labels)
            if(typeof label.labelID !== 'number' || isNaN(label.labelID) || this.labels.filter(e => e.labelID === label.labelID).length > 1)
                label.labelID = this.nextLabel++;
    }

    getLabel(labelID) {
        const label = this.labels.find(e => e.labelID === labelID);
        if(!label)
            throw new Error('No such label exists');
        return label.string;
    }

    addLabel(string) {
        this.labels.push(new DataLabel({ labelID: this.nextLabel++, string }));
    }

    updateLabel(labelID, string) {
        const label = this.labels.find(e => e.labelID === labelID);
        if(!label)
            throw new Error('No such label exists');
        label.string = string;
    }

    deleteLabel(labelID) {
        const label = this.labels.find(e => e.labelID === labelID);
        if(!label)
            throw new Error('No such label exists');
        this.labels.splice(this.labels.indexOf(label), 1);
    }

    async fetchDatafile(datafileID, connection = db) {
        return await new Datafile({ datasetID: this.datasetID, datafileID }).fetch(connection);
    }

    async searchDatafiles(query, page, pageSize = 20, connection = db) {
        return (await connection.queryAny({
            query: `SELECT * FROM datafiles WHERE datasetID = ? AND filename LIKE ? ORDER BY dateAdded DESC LIMIT ? OFFSET ?`,
            values: [this.datasetID, query, pageSize, page * pageSize]
        })).map(e => new Datafile(e));
    }

    newDatafile(params) {
        return new Datafile({
            datasetID: this.datasetID,
            datafileID: this.nextFile++,
            ...params
        });
    }

    preconditions() {
        super.assert(new Set(this.labels.map(label => label.labelID)).size === this.labels.length, 'Duplicate labelIDs present in dataset');
        super.assert(Math.max.apply(Math, this.labels.map(label => label.labelID)) < this.nextLabel, 'LabelID exists outside of reserved ID space');
    }

    async create(connection = db) {
        await super.create(connection);

        for(let i = 0 ; i < this.labels.length ; ++i)
            await connection.executeOne({
                query: `INSERT INTO dataLabels (datasetID, labelID, string) VALUES (?, ?, ?)`,
                values: [this.datasetID, this.labels[i].labelID, this.labels[i].string]
            });
    }

    async save(connection = db) {
        await super.save();

        const prevLabels = (await connection.queryAny({
            query: `SELECT labelID, string FROM dataLabels WHERE datasetID = ?`,
            values: [this.datasetID]
        })).map(e => new DataLabel(e));

        const creations = this.labels.filter(label => !prevLabels.map(e => e.labelID).includes(label.labelID));
        for(const label of creations)
            await connection.executeOne({
                query: `INSERT INTO dataLabels (datasetID, labelID, string) VALUES (?, ?, ?)`,
                values: [this.datasetID, label.labelID, label.string]
            });

        const deletions = prevLabels.filter(label => !this.labels.map(e => e.labelID).includes(label.labelID));
        if(deletions.length)
            await connection.executeAny({
                query: `DELETE FROM dataLabels WHERE datasetID = ? AND labelID IN (${Array(deletions.length).fill('?').join(', ')})`,
                values: [this.datasetID, ...deletions.map(e => e.labelID)]
            });

        const updates = this.labels.filter(label => prevLabels.map(e => e.labelID).includes(label.labelID)
            && prevLabels.find(e => e.labelID === label.labelID).string !== label.string);
        for(const label of updates)
            await connection.executeOne({
                query: `UPDATE dataLabels SET string = ? WHERE datasetID = ? AND labelID = ?`,
                values: [label.string, this.datasetID, label.labelID]
            });
    }

    async onFetch(row, connection) {
        row.labels = (await connection.queryAny({
            query: `SELECT labelID, string FROM dataLabels WHERE datasetID = ?`,
            values: [row.datasetID]
        })).map(e => new DataLabel(e));
    }

    async cascade(action, connection) {
        await super.forward(Datafile, action, connection);
    }

}

module.exports = Dataset;
