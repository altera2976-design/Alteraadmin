@echo off
echo Opening Port 5001 in Windows Firewall for EMS Backend...
netsh advfirewall firewall add rule name="EMS Backend API Port 5001" dir=in action=allow protocol=TCP localport=5001
echo.
echo Firewall rule added successfully! You can now close this window.
pause
