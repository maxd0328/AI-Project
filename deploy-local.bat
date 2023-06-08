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

:: Build docker containers
docker-compose -f docker-compose.local.yml build

:: Start local server
start cmd.exe /c "docker-compose -f docker-compose.local.yml up"
