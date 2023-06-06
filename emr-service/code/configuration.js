const db = require('../commons/database');
const s3 = require('../commons/s3');
const compiler = require('ms-compiler');

/**
 * NOTICE
 *
 * This module is DEPRECATED
 * For now, the EMR service has been removed from the Docker Compose
 * Post-MVP development will likely involve updating this module
 */

const genS3ScriptKey = (scriptID) => `script-${scriptID}.matej`;

const genS3PresetKey = (presetID) => `preset-${presetID}.matej`;

const genS3InternalConfigKey = (projectID, location) => `config-${projectID}-${location}.matej`;

const genS3DatafileKey = (datasetID, datafileID) => `datafile-${datasetID}-${datafileID}.png`;
// ----------------------------------------------------------------------------------------------------------

const genS3EMRConfigurationKey = (projectID) => `emr-cfg-${projectID}.json`;

const genS3EMR_CSVKey = (projectID) => `emr-csv-${projectID}.csv`;

function combinate(base, next, templates = {}) {
    if(!base)
        base = {};

    for(let key in next) {
        if(!next.hasOwnProperty(key) || key === 'annotations')
            continue;

        const value = next[key];
        if(compiler.matejScriptType(value) === 'layer') {
            if(compiler.KEYS.find(e => e.name === key))
                continue;

            let layerConfigurations = [];
            if(next.annotations && next.annotations[key] && next.annotations[key].use)
                for(let i = 0 ; i < next.annotations[key].use ; ++i)
                    layerConfigurations.push(templates[next.annotations[key].use[i]] || {});
            else layerConfigurations.push(base[key] || templates['default'] || {});
            layerConfigurations.push(value);

            const layerBase = {};
            const layerTemplates = {};

            for(let i = 0 ; i < layerConfigurations.length ; ++i)
                combinate(layerBase, layerConfigurations[i], layerTemplates);

            if(next.annotations && next.annotations[key] && next.annotations[key].template)
                templates[key] = layerBase;
            else
                base[key] = layerBase;
        }
        else {
            const keyInfo = compiler.KEYS.find(e => e.name === key);
            if(!keyInfo || keyInfo.type !== compiler.matejScriptType(value))
                continue;

            base[key] = value;
        }
    }
}

async function createEMRConfiguration(userID, projectID) {
    const [scripts, datafiles] = await db.transaction(async connection => {
        const scripts = [];
        let query = `SELECT presetID FROM projects WHERE userID = ? AND projectID = ?`;
        let values = [userID, projectID];

        const [project] = await connection.query(query, values);
        if(!project.length)
            throw new Error('No such project exists');

        const presetID = project[0].presetID;
        if(presetID !== null)
            scripts.push(await s3.getResource(process.env.S3_USER_BUCKET, genS3PresetKey(presetID)));

        query = `SELECT location, type, scriptID FROM configs WHERE projectID = ?`;
        values = [projectID];

        const [configs] = await connection.query(query, values);
        for(let i = 0 ; i < configs.length ; ++i) {
            if(configs[i].type === 'ext') {
                if(configs[i].scriptID !== null)
                    scripts.push(await s3.getResource(process.env.S3_USER_BUCKET, genS3ScriptKey(configs[i].scriptID)));
            }
            else scripts.push(await s3.getResource(process.env.S3_USER_BUCKET, genS3InternalConfigKey(projectID, configs[i].location)));
        }

        query = `SELECT d.datasetID, d.datafileID, l.string, d.customLabel
                                        FROM projectDatasets p
                                        JOIN datafiles d ON p.datasetID = d.datasetID
                                        LEFT JOIN dataLabels l ON d.datasetID = l.datasetID AND d.labelID = l.labelID
                                        WHERE projectID = ?`;
        values = [projectID];

        const [datafiles] = await connection.query(query, values);

        return [scripts, datafiles];
    });

    const configuration = {};
    const templates = {};

    for(let i = 0 ; i < scripts.length ; ++i) {
        const compiledScript = compiler.compile(scripts[i]);
        combinate(configuration, compiledScript, templates);
    }

    const cfgKey = genS3EMRConfigurationKey(projectID);
    const csvKey = genS3EMR_CSVKey(projectID);

    await s3.putResource(process.env.S3_USER_BUCKET, cfgKey, JSON.stringify(configuration));

    let datafileIndex = 0;
    await s3.putResourceStream(process.env.S3_USER_BUCKET, csvKey, stream => {
        while(datafileIndex < datafiles.length) {
            const datafile = datafiles[datafileIndex];
            const sanitizedLabel = (datafile.string || datafile.customLabel || '').trim().replace(/[\n\r]/, '');
            if(!sanitizedLabel) {
                datafileIndex++;
                continue;
            }

            stream.push(`${genS3DatafileKey(datafile.datasetID, datafile.datafileID)}, ${sanitizedLabel}\n`);
            return;
        }
        stream.push(null);
    });

    return [cfgKey, csvKey];
}

async function deleteEMRConfiguration(userID, projectID) {
    const query = `SELECT EXISTS(SELECT 1 FROM projects WHERE userID = ? AND projectID = ?) AS rowExists`;
    const values = [userID, projectID];
    const [result] = await db.query(query, values);
    if(!result[0].rowExists)
        throw new Error('No such project exists');

    const cfgKey = genS3EMRConfigurationKey(projectID);
    const csvKey = genS3EMR_CSVKey(projectID);

    await s3.deleteResource(process.env.S3_USER_BUCKET, cfgKey);
    await s3.deleteResource(process.env.S3_USER_BUCKET, csvKey);
}

module.exports = {
    createEMRConfiguration,
    deleteEMRConfiguration
};
