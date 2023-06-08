@echo off

:: Console react client
cd react-client
call npm run build
del /s /q ..\express-server\public\console\*.*
xcopy /s /e .\build ..\express-server\public\console\
rmdir /s /q .\build
cd ..
