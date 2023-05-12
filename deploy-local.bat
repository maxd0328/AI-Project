@echo off

:: Reset if requested
if "%1" == "reset" (
    docker-compose down --volumes
    docker system prune
    docker volume rm ai-project_db-data -f
    docker volume rm ai-project_cache-data -f
    rd /s /q .local\data-s3\
    mkdir .local\data-s3\
)

:: Create a temporary 'real' folder for commons in each microservice
for /d %%d in (*-service) do (
    mkdir %%d\commons-tmp
    xcopy /E /Y /I %%d\commons\* %%d\commons-tmp\
)

docker-compose -f docker-compose.local.yml build

:: Delete temporary folders for each service
for /d %%d in (*-service) do (
    rmdir /S /Q %%d\commons-tmp
)

:: Start local server
start cmd.exe /c "docker-compose -f docker-compose.local.yml up"
