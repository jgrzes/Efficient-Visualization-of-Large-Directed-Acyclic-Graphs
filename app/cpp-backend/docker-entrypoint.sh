#!/usr/bin/env bash
set -euo pipefail

COMPILE_SCRIPT="/app/compile_project.sh"
RUN_SCRIPT="/app/run_project.sh"
BUILD_DIR="/app/build"

chmod +x "$COMPILE_SCRIPT" "$RUN_SCRIPT" || true

if [ ! -d "$BUILD_DIR" ] || [ -z "$(ls -A "$BUILD_DIR" 2>/dev/null)" ]; then
  echo "[entrypoint] build/ missing or empty -> compiling..."
  "$COMPILE_SCRIPT"
else
  echo "[entrypoint] build/ exists and is not empty -> skipping compile"
fi

echo "[entrypoint] running..."
exec "$RUN_SCRIPT"
