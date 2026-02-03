#!/usr/bin/bash
set -ex

env ISOLATED=1 bunx --bun react-router build
cd isolated-0/client
mkdir -p node_modules/canvaskit-wasm/bin/
cp ../../node_modules/canvaskit-wasm/bin/canvaskit.wasm node_modules/canvaskit-wasm/bin/
