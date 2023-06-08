let express = require('express');
let router = express.Router();
const fetch = require('node-fetch');

/**
 * NOTICE
 *
 * This implementation is DEPRECATED
 * For now, the EMR service has been removed from the Docker Compose
 * Post-MVP development will likely involve updating this module
 */

router.delete('/:id', new ActionSequence().authenticate().withPathParameters(['id']).assert(Assertions.isInt(), 'id')
    .withEntity('project', Project, ['id']).authorize('project').append(async (seq, {project}) => {
        const response = await fetch(`http://${controller.getEMRLink(project.projectID)}/api/training/stop`, { method: 'POST' });
        if (!response.ok) {
            seq.terminate(500, { error: 'An error occurred while stopping training' });
            return;
        }
        deleteEMRConfiguration(project.projectID);
        seq.terminate(204);
    }).export());

router.get('/:id', new ActionSequence().authenticate().withPathParameters(['id']).assert(Assertions.isInt(), 'id')
    .withEntity('project', Project, ['id']).authorize('project').append(async (seq, {project}) => {
        emrParams = await controller.setUpEMRParams(project.projectID);
        controller.launchEMRCluster(emrParams);
        seq.terminate(204);
    }).export());

router.post('/score', (req, res) => {
    const data = req.body.data;
    console.log('Received data: ', data);
    res.status(200).send('Data received');
});

/**
 * NOTICE
 *
 * This module is DEPRECATED
 * For now, the EMR service has been removed from the Docker Compose
 * Post-MVP development will likely involve updating this module
 */

function setUpEMRCluster(emrParameters) {
    // Set up the EMR cluster configuration
    const params = {
        Name: emrParameters.name,
        ReleaseLabel: 'emr-6.5.0',
        Instances: {
            InstanceGroups: [
                {
                    InstanceRole: 'MASTER',
                    InstanceCount: 1,
                    InstanceType: emrParameters.emrType,
                },
                {
                    InstanceRole: 'CORE',
                    InstanceCount: emrParameters.numberOfCores,
                    InstanceType: emrParameters.emrType,
                },
            ],
            KeepJobFlowAliveWhenNoSteps: false,
            TerminationProtected: false,
        },
        Applications: [
            {
                Name: 'Spark',
            },
        ],
        VisibleToAllUsers: true,
        Steps: [
            {
                Name: 'TrainingJar',
                ActionOnFailure: 'TERMINATE_JOB_FLOW',
                HadoopJarStep: {
                    Jar: emrParameters.jarAddress,
                    Args: [
                        emrParameters.dataAddress,
                        emrParameters.configAddress,
                        emrParameters.s3name,
                        emrParameters.region,
                        emrParameters.publicKey,
                        emrParameters.privateKey,
                        emrParameters.newTraining,
                        emrParameters.networkPath,
                        emrParameters.serverIp,
                    ],
                },
            },
        ],
    };

    return params;
}

async function launchEMRCluster(emrParameters) {
    // Set up the EMR client
    const emr = new AWS.EMR();

    const params = setUpEMRCluster(emrParameters);
    const data = await emr.runJobFlow(params).promise();
}

async function addStepToCluster(stepName, emrParameters, clusterId) {
    const emr = new AWS.EMR();

    const params = {
        JobFlowId: clusterId,
        Steps: [
            {
                Name: stepName,
                ActionOnFailure: 'CONTINUE',
                HadoopJarStep: {
                    Jar: emrParameters.jarAddress,
                    Args: [
                        emrParameters.dataAddress,
                        emrParameters.configAddress,
                        emrParameters.s3name,
                        emrParameters.region,
                        emrParameters.publicKey,
                        emrParameters.privateKey,
                        emrParameters.newTraining,
                        emrParameters.networkPath,
                        emrParameters.serverIp,
                    ]
                },
            },
        ],
    };

    await emr.addJobFlowSteps(params).promise();

}

async function getEMRLink(projectID) {
    const emr = new AWS.EMR();
    const clusterId = null //add way to get clusterId from project id
    emr.describeCluster({ ClusterId: clusterId }, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data.Cluster.MasterPublicDnsName); // successful response
    });
}

class EMRParams {
    async constructor(userID, name, jarAddress, projectID, s3name, region, publicKey, privateKey, newTraining, networkPath, numberOfCores, emrType, serverIp) {
        const [configAddress, dataAddress] = await configurations.createEMRConfiguration(userID, projectID);
        this.name = name;
        this.jarAddress = jarAddress;
        this.dataAddress = dataAddress;
        this.configAddress = configAddress;
        this.s3name = s3name;
        this.region = region;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.newTraining = newTraining;
        this.networkPath = networkPath;
        this.numberOfCores = numberOfCores;
        this.emrType = emrType;
        this.serverIp = serverIp;
    }
}

async function setUpEMRParams(projectID) {
    const [cfgKey, csvKey] = configurations.createEMRConfiguration(projectID);
    return new EMRParams(projectID, process.env.JAR_LOCATION, csvKey, cfgKey, process.env.S3_USER_BUCKET,
        process.env.AWS_REGION, process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, true, null,
        process.env.EMR_CORES, process.env.EMR_TYPE, process.env.SERVER_IP);
}

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

module.exports = router;
