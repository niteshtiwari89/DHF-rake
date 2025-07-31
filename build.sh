#!/bin/bash

# Vercel Build Script
# This script ensures compatibility with Vercel's build environment

echo "Starting build process..."

# Set Node.js version
export NODE_VERSION=18

# Clear any cached modules that might cause issues
npm cache clean --force

# Install dependencies
echo "Installing dependencies..."
npm ci --only=production --legacy-peer-deps

# Install dev dependencies separately
echo "Installing dev dependencies..."
npm install --only=dev --legacy-peer-deps

# Run the build
echo "Building application..."
npm run build

echo "Build completed successfully!"
