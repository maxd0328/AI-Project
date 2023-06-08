const { Entity } = require('./entity');
const ConfigStage = require('./configStage');
const { db } = require('../instance/services');

class Project extends Entity {

    static PROJECT_TYPES = Object.freeze(['cnn']);

    constructor({ projectID, userID, name, type, presetID, lastModified, datasetIDs }) {
        super(Project, 'projects', ['projectID'], ['userID', 'name', 'type', 'presetID', 'lastModified'], true);
        super.setOrdering('lastModified', false);
        this.projectID = projectID;
        this.userID = userID;
        this.name = name;
        this.type = type;
        this.presetID = presetID;
        this.lastModified = lastModified;
        this.datasetIDs = datasetIDs;
    }

    defaultParams() {
        return { name: 'New Project', type: 'cnn', presetID: null, lastModified: Date.now(), datasetIDs: [] };
    }

    preconditions() {
        super.assert(Project.PROJECT_TYPES.includes(this.type), 'Project type must be one of the following: ' + Project.PROJECT_TYPES.join(', '));
        super.assert(new Set(this.datasetIDs).size === this.datasetIDs.length, 'Linked dataset IDs must be unique');
    }

    async fetchStage(location, connection = db) {
        return await new ConfigStage({ projectID: this.projectID, location }).fetch(connection);
    }

    async fetchStages(connection = db) {
        return await new ConfigStage({ projectID: this.projectID }).fetchAll(connection);
    }

    // A workaround to be more efficient, this will fail to account for changes to the finalization cascades
    async clearStages(connection = db, rollbackEvents = null) {
        const stages = await this.fetchStages(connection);
        for(const stage of stages)
            await stage.deleteContent(rollbackEvents);
        await connection.executeAny({
            query: `DELETE FROM configs WHERE projectID = ?`,
            values: [this.projectID]
        });
    }

    newStage(location, params) {
        return new ConfigStage({
            projectID: this.projectID,
            location,
            ...params
        });
    }

    async create(connection = db) {
        await super.create(connection);

        for(let datasetID of this.datasetIDs)
            await connection.executeOne({
                query: `INSERT INTO projectDatasets (projectID, datasetID) VALUES (?, ?)`,
                values: [this.projectID, datasetID]
            });
    }

    async save(connection = db) {
        await super.save(connection);

        const prevDatasetIDs = (await connection.queryAny({
            query: `SELECT datasetID FROM projectDatasets WHERE projectID = ?`,
            values: [this.projectID]
        })).map(obj => obj.datasetID);

        const createDatasetIDs = this.datasetIDs.filter(id => !prevDatasetIDs.includes(id));
        for(const datasetID of createDatasetIDs)
            await connection.executeOne({
                query: `INSERT INTO projectDatasets (projectID, datasetID) VALUES (?, ?)`,
                values: [this.projectID, datasetID]
            });

        const deleteDatasetIDs = prevDatasetIDs.filter(id => !this.datasetIDs.includes(id));
        if(deleteDatasetIDs.length)
            await connection.executeAny({
                query: `DELETE FROM projectDatasets WHERE projectID = ? AND datasetID IN (${Array(deleteDatasetIDs.length).fill('?').join(', ')})`,
                values: [this.projectID, ...deleteDatasetIDs]
            });
    }

    async onFetch(row, connection) {
        row.datasetIDs = (await connection.queryAny({
            query: `SELECT datasetID FROM projectDatasets WHERE projectID = ?`,
            values: [row.projectID]
        })).map(obj => obj.datasetID);
    }

    async cascade(action, connection, rollbackEvents) {
        await super.forward(ConfigStage, action, connection, rollbackEvents);
    }

}

module.exports = Project;
