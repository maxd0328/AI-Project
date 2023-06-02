const db = require('../commons/database');

// TODO these are all duplicates from a different service, condense this when redoing the server architecture
const genS3ScriptKey = (userID, scriptID) => `script-${userID}-${scriptID}.matej`;

const genS3PresetKey = (presetID) => `preset-${presetID}.matej`;

const genS3InternalConfigKey = (projectID, location) => `config-${projectID}-${location}.matej`;

const genS3DatafileKey = (datasetID, datafileID) => `datafile-${datasetID}-${datafileID}.png`;
// ----------------------------------------------------------------------------------------------------------

function createEMRConfiguration(projectID) {

}

function deleteEMRConfiguration(projectID) {

}

module.exports = {
    createEMRConfiguration,
    deleteEMRConfiguration
};
