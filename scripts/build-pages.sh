#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
mkdir -p public
cp src/worker.js public/_worker.js
