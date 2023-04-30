@echo off

:: Enter folder for argument-specified service
cd .\%1

:: Build the docker image using the Dockerfile
docker build -t %1 .
docker tag %1:latest 863286959775.dkr.ecr.us-east-1.amazonaws.com/ai-project-%1:latest

:: Push the image to the corresponding Amazon ECR (Elastic Container Registry) repository
docker push 863286959775.dkr.ecr.us-east-1.amazonaws.com/ai-project-%1:latest

:: Leave directory
cd ..
