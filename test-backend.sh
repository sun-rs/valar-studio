#!/bin/bash

# Test script to start backend directly

echo "Testing backend startup..."

cd backend

echo "Starting backend with /opt/homebrew/bin/python..."
/opt/homebrew/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000