#!/usr/bin/env bash
# // Copyright 2014 Google Inc. All rights reserved.
# //
# // Licensed under the Apache License, Version 2.0 (the "License");
# // you may not use this file except in compliance with the License.
# // You may obtain a copy of the License at
# //
# //   http://www.apache.org/licenses/LICENSE-2.0
# //
# // Unless required by applicable law or agreed to in writing, software
# // distributed under the License is distributed on an "AS IS" BASIS,
# // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# // See the License for the specific language governing permissions and
# // limitations under the License.
# /**
#  * @fileoverview Shell script to download End-To-End build dependencies
#  *
#  * @author koto@google.com (Krzysztof Kotowicz)
#  */

export JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF8

# symlink function with fallback on cp in case of failure.
symlink() {
  ln -s "$@" || cp -R "$@"
}

type ant >/dev/null 2>&1 || {
  echo >&2 "Ant is required to build End-To-End dependencies."
  exit 1
}
type javac >/dev/null 2>&1 || {
  echo >&2 "Java compiler is required to build End-To-End dependencies."
  exit 1
}
jversion=$(java -version 2>&1 | grep version | awk -F '"' '{print $2}')
if [[ $jversion < "1.7" ]]; then
  echo "Java 1.7 or higher is required to build End-To-End."
  exit 1
fi

if [ ! -d lib ]; then
  mkdir lib
fi

git submodule init
git submodule update

cd lib

# symlink typedarray
if [ ! -d typedarray ]; then
  mkdir typedarray
  symlink ../zlib.js/define/typedarray/use.js typedarray/use.js
fi

# build closure compiler
if [ ! -f closure-compiler/build/compiler.jar ]; then
  cd closure-compiler
  ant clean
  ant jar
  cd ..
fi

# checkout closure templates compiler
if [ ! -d closure-templates-compiler ]; then
  curl https://dl.google.com/closure-templates/closure-templates-for-javascript-latest.zip -O # -k --ssl-added-and-removed-here-;-)
  unzip closure-templates-for-javascript-latest.zip -d closure-templates-compiler
  rm closure-templates-for-javascript-latest.zip
fi

# build css compiler
if [ ! -f closure-stylesheets/build/closure-stylesheets.jar ]; then
  cd closure-stylesheets
  ant
  cd ..
fi

if [ -f chrome_extensions.js ]; then
  rm -f chrome_extensions.js
fi

# Temporary fix
# Soy file bundled with the compiler does not compile with strict settings:
# lib/closure-templates-compiler/soyutils_usegoog.js:1762: ERROR - element JS_STR_CHARS does not exist on this enum
cd closure-templates-compiler
curl https://raw.githubusercontent.com/google/closure-templates/05890ed973229bb8ae8a718b01b6ad80560243eb/javascript/soyutils_usegoog.js -O
if [ -f soyutils.js ]; then
  # soyutuls.js re-declares goog, which breaks closure
  mv soyutils.js soyutils.js.notused
fi
cd ..

cd ..
