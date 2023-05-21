@echo off

:: Console react client
cd react-client
call npm run build
del /s /q ..\core-service\public\console\*.*
xcopy /s /e .\build ..\core-service\public\console\
rmdir /s /q .\build
cd ..
