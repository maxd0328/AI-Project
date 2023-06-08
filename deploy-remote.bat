@echo off

:: Build the docker image using the Dockerfile
docker build -t ai-project-server .
docker tag %1:latest 863286959775.dkr.ecr.us-east-1.amazonaws.com/ai-project-server:latest

:: Push the image to the corresponding Amazon ECR (Elastic Container Registry) repository
docker push 863286959775.dkr.ecr.us-east-1.amazonaws.com/ai-project-server:latest

:: Automatically deploy docker-compose.yml to AWS
eb deploy
