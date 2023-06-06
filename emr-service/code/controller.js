const AWS = require('../commons/aws').aws;
const configurations = require('./configuration');

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
