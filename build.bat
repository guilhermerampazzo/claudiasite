@echo off
E:
cd E:\coder\claudiasite
set NEXT_TELEMETRY_DISABLED=1
E:\programas\node\node.exe node_modules\next\dist\bin\next build > E:\coder\claudiasite\.build.log 2>&1
echo EXIT=%ERRORLEVEL% >> E:\coder\claudiasite\.build.log
