#!/usr/bin/env bash

if [[ "$0" != "$BASH_SOURCE" ]]; then echo "no sourcing">&2; return 1; fi;

full="$(readlink -f "$BASH_SOURCE")"; dir=${full%\/*}; file=${full##*/};

docker run --rm -d -p 127.0.0.1:8000:8000/tcp --name 6502asm -w /app -v $dir:/app python:3.11-alpine python http_server.py
