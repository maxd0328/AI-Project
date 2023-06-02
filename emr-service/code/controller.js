const AWS = require('../commons/aws').aws;
const configurations = require('./configuration');

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
              ]
            },
          },
        ],
      };

     await emr.addJobFlowSteps(params).promise();

}

async function getEMRLink(clusterID) {
    const emr = new AWS.EMR();
    emr.describeCluster({ ClusterId: clusterId }, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data.Cluster.MasterPublicDnsName); // successful response
    });
}

class EMRParams {
  constructor(userID, name, jarAddress, projectID, s3name, region, publicKey, privateKey, newTraining, networkPath, numberOfCores, emrType) {
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
  }
}
