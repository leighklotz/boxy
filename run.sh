#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"

python3 -m http.server 8080 --bind 127.0.0.1 --directory "${SCRIPT_DIR}"


