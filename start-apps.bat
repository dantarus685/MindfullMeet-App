@echo off
echo Starting backend...
cd backend
call npm install
start cmd /k "npm start"
cd ..

echo Starting frontend...
cd mindfulmeet-app
call npm install
start cmd /k "npm start"
