@echo off

:: If no arguments were passed, build every image
if "%1" == "" (
    .\build-image.bat core-service
) else (
    :: Build image provided by argument
    .\build-image.bat %1
)

:: Automatically deploy docker-compose.yml to AWS
eb deploy
