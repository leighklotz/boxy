#!/bin/bash

BIND_IP="127.0.0.1"
#BIND_IP="0.0.0.0"
PORT=8080

SCRIPT_DIR="$(dirname "$(realpath "$0")")"

python3 -m http.server "${PORT}" --bind "${BIND_IP}" --directory "${SCRIPT_DIR}"


