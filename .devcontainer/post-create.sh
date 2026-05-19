#!/bin/bash
# Post-create setup script for the Scripture Forge devcontainer.
# This runs after the container is created and sets up the development environment.
set -euo pipefail

echo "=== Restoring .NET tools ==="
sudo dotnet workload update
dotnet tool restore

echo "=== Restoring .NET packages ==="
dotnet restore

echo "=== Installing RealtimeServer packages ==="
cd src/RealtimeServer
pnpm install --frozen-lockfile

echo "=== Installing ClientApp packages ==="
cd ../SIL.XForge.Scripture/ClientApp
pnpm install --frozen-lockfile

echo "=== Post-create setup complete ==="
