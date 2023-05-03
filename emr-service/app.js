const AWS = require('aws-sdk');

let express = require('express');
let app = express();

app.use('/', require('./routes/emr'));

module.exports = app;

function setUpEMRCluster(name, jarAddress, dataAddress, networkParams) {
  // Set up the EMR client
  const emr = new AWS.EMR();

  // Set up the EMR cluster configuration
  const params = {
    Name: name,
    ReleaseLabel: 'emr-6.5.0',
    Instances: {
      InstanceGroups: [
        {
          InstanceRole: 'MASTER',
          InstanceCount: 1,
          InstanceType: 'm5.xlarge',
        },
        {
          InstanceRole: 'CORE',
          InstanceCount: 2,
          InstanceType: 'm5.xlarge',
        },
      ],
      KeepJobFlowAliveWhenNoSteps: true,
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
            Jar: jarAddress,
            Args: [
              dataAddress,
              networkParams,
            ],
          },
        },
      ],
  };

  return params;
}

function launchEMRCluster(name, jarAddress, dataAddress, networkParams) {
        const params = await setUpEMRCluster(name, jarAddress, dataAddress, networkParams)
        const data = await emr.runJobFlow(params).promise();
    };
  }

function addStepToCluster(clusterID, jarAddress, dataAddress, networkParams) {
      const emr = new AWS.EMR();

      const params = {
        JobFlowId: clusterId,
        Steps: [
          {
            Name: stepName,
            ActionOnFailure: 'CONTINUE',
            HadoopJarStep: {
              Jar: jarAddress,
              Args:
              dataAddress,
              networkParams,
            },
          },
        ],
      };

     await emr.addJobFlowSteps(params).promise();

}