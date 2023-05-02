@echo off

:: If no arguments were passed, build every image
if "%1" == "all" (
    .\build-image.bat core-service
    .\build-image.bat user-service

    :: Automatically deploy docker-compose.yml to AWS
    eb deploy
) else if "%1" == "" (
    :: Automatically deploy docker-compose.yml to AWS
    eb deploy
) else (
    :: Build image provided by argument
    .\build-image.bat %1

    :: Automatically deploy docker-compose.yml to AWS
    eb deploy
)