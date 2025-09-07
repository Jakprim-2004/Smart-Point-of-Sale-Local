
cd web/app || goto :error

call npm install || goto :error

call npm start  || goto :error

goto :EOF

:error
echo Failed with error #%errorlevel%.
pause
exit /b %errorlevel%
