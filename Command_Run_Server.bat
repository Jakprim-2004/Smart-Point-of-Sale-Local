@echo off

cd api || goto :error

call npm install || goto :error

call npx nodemon index.js || goto :error

call code . || goto :errorzz

goto :EOF

:error
echo Failed with error #%errorlevel%.
pause
exit /b %errorlevel%



