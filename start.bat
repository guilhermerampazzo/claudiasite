@echo off
E:
cd E:\coder\claudiasite
set NEXT_TELEMETRY_DISABLED=1
:loop
E:\programas\node\node.exe node_modules\next\dist\bin\next start -H 0.0.0.0 -p 3000 >> E:\coder\claudiasite\.server.log 2>&1
echo [%date% %time%] servidor saiu, reiniciando... >> E:\coder\claudiasite\.server.log
timeout /t 3 /nobreak >nul
goto loop
