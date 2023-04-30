
# AI Project

This project is a web service that allows users to create and train their own
ML models with little to no experience with machine learning.

Collaborators: Max Derbenwick, Matej Bavec, Madhav Venkatesh

## Prerequisites

...

## Building and Deploying

Each microservice is built as a docker container, and pushed to a corresponding
Amazon ECR (Elastic Container Registry) repository. These repositories are then
deployed to the Beanstalk server via the ```docker-compose.yml``` configuration
file.

To build a service and push it to its ECR repository, run the following script
(note that the folders denote the microservice names):

```
.\build-image.bat [microservicename]
```

To build one or all of the microservices and deploy the current configuration to
Elastic Beanstalk, run the following script:

```
.\deploy-server.bat [microservice name OR leave blank for all]
```

To deploy to the configuration to the server without rebuilding any of the
servers, run the following command:

```
eb deploy
```

## Development

Each service is containerized in its own folder, with a series of configuration
files. The purpose of each file is as follows:

 * **.dockerignore:** Similar to a .gitignore file, this file lists everything
in the directory which should be ignored by docker when building the image. If
it shouldn't be on Beanstalk, make sure it's included in this file.
 * **Dockerfile:** Specifies the build procedure for the Docker image. It should
be fine as is, as everything for the Express server is already sorted out.
However, in the event that an additional dependency must be built in a special
way, build instructions must be included in this file.
 * **package.json:** Specifies the Node.js version, dependencies, and npm scripts
for the service. Any additional dependencies or desired scripts (which can be
run from the Dockerfile), must be added in this file.
 * **package-lock.json:** An exact dependency tree for the service, this one is
managed fully by IntelliJ, there's no need to modify it.

Additionally, note the ```docker-compose.yml``` file at the root of the project.
This file is deployed to the Elastic Beanstalk server, and has deployment
information for every Docker container in the project (i.e. every service).
In this file, environment variables, port mapping ```"[external]:[internal]"```,
and  service dependency is specified. Whenever a new service is added, an entry
for it must be made in this file.

Finally, note that the Express server for each microservice has its entry point
in the file ```bin/www```, however this file is not necessary to edit. The setup
code for the service can be written in the ```app.js``` file.
