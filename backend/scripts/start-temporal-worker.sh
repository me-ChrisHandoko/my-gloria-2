#!/bin/bash

# Start Temporal Worker
# This script starts the Temporal worker process

set -e

echo "═══════════════════════════════════════════════════════"
echo "  Starting Temporal Worker for Gloria System"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if Temporal is running
echo "Checking Temporal server connection..."
if ! curl -s http://localhost:8233 > /dev/null 2>&1; then
  echo "⚠️  Warning: Temporal UI not accessible at http://localhost:8233"
  echo "   Make sure Temporal is running: docker-compose -f docker-compose.temporal.yml up -d"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Load environment variables
if [ -f .env ]; then
  echo "✓ Loading environment variables from .env"
  export $(cat .env | grep -v '^#' | xargs)
fi

echo ""
echo "Worker Configuration:"
echo "  - Task Queue: ${TEMPORAL_TASK_QUEUE:-gloria-workflows}"
echo "  - Namespace: ${TEMPORAL_NAMESPACE:-default}"
echo "  - Address: ${TEMPORAL_ADDRESS:-localhost:7233}"
echo ""

# Start worker
echo "Starting worker..."
npx ts-node src/temporal/worker.ts

echo ""
echo "Worker stopped"
