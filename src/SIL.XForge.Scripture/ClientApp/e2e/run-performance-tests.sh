#!/bin/bash
# Builds a production Angular bundle, starts the .NET backend to serve it, and runs e2e
# performance tests using the slow_network preset to simulate a slow connection. This gives
# realistic performance measurements because production builds are minified and optimized.
set -ueo pipefail

SCRIPT_DIR="$(dirname "$(readlink --canonicalize "$0")")"
CLIENT_APP_DIR="${SCRIPT_DIR}/.."
SERVER_DIR="${SCRIPT_DIR}/../.."
PROGRAM_NAME="PerformanceTestLauncher"
OUTPUT_DIR="${SCRIPT_DIR}/test_output/performance_test_results"

function output() {
  echo "${PROGRAM_NAME}:" "$@"
}

function reportElapsedTime() {
  local elapsed="${SECONDS}"
  local minutes="$((elapsed / 60))"
  local seconds="$((elapsed % 60))"
  output "Elapsed time: ${minutes}m ${seconds}s"
}

function shutDownServer() {
  local pid="$1"
  reportElapsedTime
  output "Shutting down server with PID ${pid}."

  kill -TERM "${pid}" 2>/dev/null || {
    output "Error sending SIGTERM."
    exit 1
  }

  local timeout="35"
  for ((i = 0; i < timeout; i++)); do
    if ! kill -0 "${pid}" 2>/dev/null; then
      output "Server shut down."
      return
    fi
    sleep 1s
  done

  # If still running, send SIGKILL
  output "Timeout. Sending SIGKILL."
  kill -KILL "${pid}" 2>/dev/null
}

function buildProductionBundle() {
  output "Building Angular application in production mode..."
  cd "${CLIENT_APP_DIR}"
  # npm run build uses 'ng build', which defaults to the production configuration (see angular.json)
  npm run build
  output "Production build complete."
  cd "${SCRIPT_DIR}"
}

function startServer() {
  mkdir -p "${OUTPUT_DIR}"
  local dotnet_log="${OUTPUT_DIR}/dotnet.txt"
  output "Logging .NET output to ${dotnet_log}"
  cd "${SERVER_DIR}"
  # Pass --start-ng-serve=none so the server serves the production build from ClientApp/dist/browser
  # rather than starting 'ng serve'.
  export ASPNETCORE_ENVIRONMENT="Development"
  nohup dotnet run -- --start-ng-serve=none &>"${dotnet_log}" &
  local server_pid="$!"
  trap "shutDownServer ${server_pid}" EXIT
  output "Server started with PID ${server_pid}"
  cd "${SCRIPT_DIR}"
  ./await-application-startup.mts
}

output "$(date -Is) Starting performance test run."
buildProductionBundle
startServer
cd "${SCRIPT_DIR}"
./e2e.mts slow_network performance_load_times
