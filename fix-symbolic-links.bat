@echo off
setlocal enabledelayedexpansion

set "commons=%CD%\commons"

for /d %%d in (*-service) do (
    set "link=%%d\commons"
    if exist "!link!" (
        echo Deleting existing symbolic link: !link!
        rmdir /Q /S "!link!"
    )
    echo Creating new symbolic link: !link! ^>^> !commons!
    mklink /D "!link!" "!commons!"
)

echo Done.
