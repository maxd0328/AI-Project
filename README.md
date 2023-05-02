
# AI Project

This project is a web service that allows users to create and train their own
ML models with little to no experience with machine learning.

Collaborators: Max Derbenwick, Matej Bavec, Madhav Venkatesh

## 1. Prerequisites

In order for all the build and deployment scripts to work, the following software
must be installed locally:

* AWS CLI
* Docker
* Elastic Beanstalk (EB) CLI

### 1.1 A Note on PATH

At various points during the installation process, it is possible that software
might not run on the terminal even after being installed, giving a message like
this:

```
[pgrm]: The term '[pgrm]' is not recognized as the name of a cmdlet, function, script file, or operable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
```

The most common cause of this is that the software is not included in PATH,
Window's list of all directories that contain runnable CLI software. To add
a program to PATH, follow the steps below:

1. Locate the path to the folder containing the desired executable.
2. Open Settings, and navigate to ```System > About > Advanced system settings >
Environment variables > System variables```
3. Select 'Path', and click 'Edit'.
4. Click 'New', and paste the folder path into the new field, and press OK.

Then, restart your terminal and try to run the software again.

### 1.2 Installing the AWS CLI

To install the AWS CLI, simply run the following command to fetch and run the
installer:

```
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

You can verify that the installation completed successfully by restarting the
terminal and typing the following command:

```
aws --version
```

Next, you have to authenticate the AWS CLI with your IAM user credentials. To
do so, run the following command and fill in the fields as follows (note that
the secret access key is non-accessible on the IAM Console after creation of the
keypair, and a new keypair must be created if it is forgotten):

```
$ aws configure
AWS Access Key ID [None]: [your access key, accessible from the IAM Console]
AWS Secret Access Key [None]: [your secret access key, which you should've saved]
Default region name [None]: us-east-1
Default output format [None]: json
```

### 1.3 Installing Docker

To install Docker, there are first a couple of prerequisites to ensure that it
installs properly. Firstly, ensure that there is a valid version of Windows
Subsystem for Linux installed, Ubuntu should suffice. You can do this with the
following command:

```
wsl install -d Ubuntu
```

In the event that it's not available, you can view all available distros with
the following command (Debian is probably the next best choice):

```
wsl --list --online
```

Next, to prevent Docker from spontaneously exploding when installed, the
following workaround must be performed:

1. Open Windows Security
2. Navigate to ```App & browser control > Exploit protection settings > 
Program settings > vmcompute.exe > Edit```
3. Scroll down to Control Flow Guard (CFG), and ensure that "Override system
settings" is **unchecked**.

Once these steps have been performed, you can go to the following link to
download Docker Desktop for Windows:

https://www.docker.com/products/docker-desktop/

Ensure that Docker is properly installed on the CLI by running:

```
docker --version
```

Once Docker has been installed, it must be authenticated with AWS so that the
Docker images can be pushed to the Amazon ECR (Elastic Container Registry). To
do so, run the following command to pipe the AWS login key into the Docker
authentication command:

```
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin https://[IAM account ID].dkr.ecr.us-east-1.amazonaws.com
```

**Important note:** It is possible that from time to time you may get the
following message when attempting to build and push a Docker image:

```
denied: Your authorization token has expired. Reauthenticate and try again.
```

If this is the case, simply run the authentication command given above again.

### 1.4 Installing the Elastic Beanstalk CLI

In order to install the Elastic Beanstalk CLI, you'll first need to install both
Python (if you don't have it already) and virtualenv. You may already have Python
3, you can verify by running the following with the expected output (at least
3.5+)

```
$ python --version
Python 3.10.11
```

If not, you can download it from https://www.python.org/downloads/. Restart your
terminal and verify that you can check the version correctly with the command
above.

Next, virtualenv is installed with a Python script called pipx. Install pipx
following the structure below:

```
$ python -m pip install --user pipx
...
WARNING: The script pipx.exe is installed in `...` which is not on PATH
$ cd [aforementioned folder]
$ .\pipx ensurepath
```

If there is no warning message about PATH, then the final step is not necessary.
Restart your terminal and try to run ```pipx ensurepath```. It is very likely
that it still won't work, and if this is the case, consult Section 1.1.

Once pipx has been installed, run the following command to install virtualenv:

```
pipx install virtualenv
```

Restart the terminal and ensure that virtualenv has been installed by running:

```
virtualenv --help
```

Finally, with all prerequisites, the EB CLI can be installed. Navigate to a safe
folder (outside the project), and run the following commands:

```
git clone https://github.com/aws/aws-elastic-beanstalk-cli-setup.git
python .\aws-elastic-beanstalk-cli-setup\scripts\ebcli_installer.py
```

Once again, the installation will likely not be added to PATH. The output of the
installation contains instructions for rectifying this, but Section 1.1 can also
be consulted keeping in mind the install location of the EB CLI (mentioned in
the installation output messages). After adding the EB CLI to path, run ```eb```
to ensure that it is properly installed.

If when running the installation script, a message is returned along the lines
of "execution of scripts is disabled on this system", run the following command
first and restart the terminal:

```
Set-ExecutionPolicy RemoteSigned
```

After following all of these steps, the EB CLI as well as all other prerequisites
should be installed, and all scripts in this project should be functional.

## 2. Building and Deploying

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

## 3. Development

### 3.1 Breaking Down Services

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

### 3.2 Creating New Services

To create a new service, you can create a new folder in the project directory
named exactly as the desired name of the service. Make sure that this new folder
has the following:

 * A copy of ```bin/www``` from any of the other services
 * A ```package-lock.json``` and ```package.json``` (which can likely be copied
from another service, but adjust as necessary)
 * A ```.dockerignore```, ensuring that ```node_modules``` is excluded from the
image.
 * A ```Dockerfile```, which can likely just be a copy from another service, but
feel free to make adjustments if necessary and if you know what you're doing.
 * An ```app.js```, which is entirely up to you. This is where your Express
service begins.

Next, you have to create an ECR repository for this service. You can do so by
the following steps:

1. Go to the AWS ECR Console.
2. Click on 'Create repository' in the top right.
3. Ensure that it is set to private, and be **sure** to name it exactly as
follows: ```ai-project-service-name```, where service-name is the same name as
the service's folder in the Git repository.
4. Leave all other settings default, and submit.
5. Now that the repository is created, take note of the **URI**, which is
displayed to the right of the repository's name in the console (```Amazon ECR >
Repositories```).

Once the repository is created, you can now link it to Elastic Beanstalk by
editing the ```docker-compose.yml``` file. Under services, add the following:

```
[your-service-name]:
  image: [URI]
  ports:
    - "[external port]:[internal port]"
  environment:
    NODE_ENV: production
    PORT: [internal port]
  depends_on:
    - dependency1
    - dependency2
```

 * Paste the URI into the 'image' field.
 * Choose an external port, make sure that no two services have the same
external port
 * Choose an internal port (put it in both places), 8080 is usually fine.
 * You can add any additional environment variables you'd like (accessible in
JavaScript via ```process.env.[variable-name]```)
 * The 'depends_on' part is optional, but if the service uses any other services,
put the name of each of those services. Otherwise, the entire block can be
omitted.

Make sure to substitute all applicable fields, and to run the build and deploy
scripts afterwards.

Finally, the load balancer needs to be configured to recognize this new service
and forward all appropriate traffic to it. To do this, go to the Elastic
Beanstalk console, and navigate to ```Environment > Configuration > Instance
traffic and scaling > Edit > Processes > Add process```. Configure as follows:

 * **Name:** your service's name in camel case (i.e. core-service -> coreService).
 * **Port:** your service's external port.
 * **Protocol:** Leave as HTTP.
 * **Health check path:** Any route handled by your service.

Then scroll down to Rules, and add a rule for your service with the same name
as the process created above.

 * Leave listener port as the default.
 * Add a PathPatterns match condition for each route your service handles. For
example:
   * /
   * /login
   * /my/route
   * /route/* (to match all sub-routes of /route)
 * For process, select the name of the process you created above.

Make sure you've saved your process and rule, and then scroll all the way down
to save the configuration. Then, once the Beanstalk environment updates, be
sure that your routes are accessible on the web.

## 4. SSH Connection

The EC2 instances can be connected to via SSH for debugging, but only if the
instance has an associated key-pair.

If there is already a known key-pair associated with the instance, it can be
connected to via the public DNS. You can find the public DNS in the EC2 console
by going to ```Instances > [Desired instance] > Instance summary > Public IPv4
DNS```. Connect to it using the following command:

```
ssh -i [path\to\private-key] root@[public IPv4 DNS]
```

In the event that root doesn't work as a username, it may ask you instead to
authenticate under user ```ec2-user```, which is fine as well.

If there is no known keypair associated with the instance (or if you do not
have access to an already existing keypair), you can create one via the following
steps:

1. Locate a suitable keypair. These can usually be found in ```~\.ssh```, where
the private key is stored in ```.ssh\[name]``` and the public key is stored in
```.ssh\[name].pub```. If you want to create a new keypair, you can do so with
the ```ssh-keygen``` command.

2. Ensure that SSH is allowed on the EC2 instance. To do this, go to the EC2
console and navigate to ```Instances > [Desired instance] > Security > Inbound
Rules```. There should be a rule with port range 22 and source ```0.0.0.0/0```.

3. If SSH is not currently allowed on the instance, click on the hyperlink in
the Security Groups column, and navigate to ```Inbound rules > Edit inbound
rules > Add rule```. Then, select SSH, and enter 0.0.0.0/0 into the Source
field. Finally, save the rules in the bottom right.

4. Return to the instance summary, and navigate to ```Connect > EC2 Instance
Connect > Connect```, leaving username as root. You will then connect remotely
to the instance via a limited web client.

5. To add your keypair to the instance, copy the contents of your
```.ssh\[keypair].pub``` file to your clipboard. Then, in the remote terminal,
type the following command:  
```echo "[copied contents]" >> ~/.ssh/authorized_keys```

6. The instance now has SSH enabled for your keypair, and you can connect
remotely via the command at the top of this section. You can also view all
authorized public keys in the instance with the command
```cat ~/.ssh/authorized_keys``` in the remote terminal.

### 4.1 Using the Remote Terminal

The remote terminal for the instance is a Linux terminal, so any Linux command
is applicable. For example, you can use curl or ping to test local connection
to web services hosted on the instance. Netstat can also show the status of the
ports on the instance.

Most importantly, the remote terminal allows you to access the instance logs.
Every log is stored in or in a subfolder of the following directory:

```
/var/log
```

You can either read these files out directly using the cat command, or using
a handy command for reading out the most recent couple lines and continually
printing more lines as they come in. You can type this command as the following:

```
sudo tail -f [log file]
```
