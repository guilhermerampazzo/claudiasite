@echo off
E:
cd E:\coder\claudiasite
set NEXT_TELEMETRY_DISABLED=1
E:\programas\node\node.exe node_modules\next\dist\bin\next dev -H 0.0.0.0 -p 3000 > E:\coder\claudiasite\.dev-server.log 2>&1
