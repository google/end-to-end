#!/usr/bin/env bash
# Copyright 2015 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

type sha1sum >/dev/null 2>&1 || {
  echo >&2 "sha1sum is needed to verify download dependencies."
  exit 1
}

download() {
  if [ ! -f "$2" ]; then
    curl -sSL "$1" -o "$2" || {
      echo >&2 "Failed to download $1"
      exit 1
    }
  fi
}

verify() {
  actual=$(sha1sum "$1" | awk '{print $1}')

  if [ "$actual" != "$2" ]; then
    rm -f "$1"
    echo >&2 "Invalid checksum after downloading $1"
    exit 1
  fi
}  

ensure() {
  info=(${2//:/ })
  file="${info[0]}"
  sha="${info[1]}"

  download "$1/$file" "lib/$file"
  verify "lib/$file" "$sha"
}

cd ${0%/*}

if [ ! -d lib ]; then
  mkdir lib
fi

bclibs=(\
bcpg-jdk15on-153.jar:06203927820108eb33bd1a78b07dfd3bfc265b89 \
bcprov-jdk15on-153.jar:9d3def2fa5a0d2ed0c1146e9945df10d29eb4ccb)

for lib in "${bclibs[@]}"; do
  ensure "http://www.bouncycastle.org/download" $lib
done

ensure \
  "http://central.maven.org/maven2/com/google/code/gson/gson/2.3.1" \
  "gson-2.3.1.jar:ecb6e1f8e4b0e84c4b886c2f14a1500caf309757"
