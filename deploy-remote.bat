@echo off

:: If no arguments were passed, build every image
if "%1" == "all" (
    :: Build all images
    for /d %%d in (*-service) do (
        .\build-image.bat %%d
    )

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