@echo off
echo Installing Node modules for Storm-Backend...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in PATH. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if Bun is installed (since the project uses Bun)
where bun >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Bun is not installed or not in PATH. Attempting to install with npm...
    npm install -g bun
    if %ERRORLEVEL% neq 0 (
        echo Failed to install Bun. Please install it manually.
        pause
        exit /b 1
    )
)

echo Using Bun to install dependencies...
bun install

if %ERRORLEVEL% neq 0 (
    echo Failed to install dependencies with Bun. Trying with npm...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo Failed to install dependencies. Please check your internet connection and try again.
        pause
        exit /b 1
    )
)

echo Dependencies installed successfully!
echo You can now run the project using start.bat
pause