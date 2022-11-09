#!/bin/bash

yarn run build
cp index.html build
cp node_modules/pathkit-wasm/bin/pathkit.wasm build
cd build
surge . geometric-art.surge.sh