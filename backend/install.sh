#!/bin/bash

echo "Installing Python dependencies..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "Python found!"
echo ""

# Upgrade pip first
echo "Upgrading pip..."
python3 -m pip install --upgrade pip

echo ""
echo "Installing dependencies from requirements.txt..."
python3 -m pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Installation failed!"
    echo "Try running: python3 -m pip install --user -r requirements.txt"
    exit 1
fi

echo ""
echo "========================================"
echo "Installation completed successfully!"
echo "========================================"
echo ""
echo "You can now run the server with:"
echo "  python3 main.py"
echo ""

