#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo 'specify folder'
    exit 1
fi

cp -f ./blog/core.txt $1/index.ts
mkdir "$1/files"
cp -f ./blog/files/main.css $1/files/main.css