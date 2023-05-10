@echo off

:: Console react client
cd core-service\react-client
call npm run build
del /s /q ..\public\console\*.*
xcopy /s /e .\build ..\public\console\
rmdir /s /q .\build
cd ..\..
