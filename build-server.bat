@echo off

:: Compress beanstalk-server into zip for packaging
cd beanstalk-server
tar.exe -a -c -f ../beanstalk-server.zip^
    app.js^
    package.json^
    package-lock.json
cd ..

:: Automatically deploy to AWS
eb deploy
