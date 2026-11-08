#!/usr/bin/env bash
cd "$(dirname "$0")"
. ./node-env.sh
[ -d node_modules ] || npm install
npm start
