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
CLOSURE_LIB_COMMIT="35c9311042b95796d7b12f58cd2bec6086052f7e"

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
cd lib

# checkout closure library
if [ ! -d closure-library/.git ]; then
  git clone https://github.com/google/closure-library closure-library
  cd closure-library
  git checkout $CLOSURE_LIB_COMMIT
  cd ..
fi

# checkout zlib.js
if [ ! -d zlib.js/.git ]; then
  git clone --depth 1 https://github.com/imaya/zlib.js zlib.js
  mkdir typedarray
  ln -s ../zlib.js/define/typedarray/use.js typedarray/use.js
fi

# checkout closure compiler
if [ ! -d closure-compiler/.git ]; then
  if [ -d closure-compiler ]; then # remove binary release directory
    rm -rf closure-compiler
  fi
  git clone --branch maven-release-v20150315 --depth 1 https://github.com/google/closure-compiler closure-compiler
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

# checkout css compiler
if [ ! -d closure-stylesheets ]; then
  git clone https://github.com/google/closure-stylesheets
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
curl https://raw.githubusercontent.com/google/closure-templates/master/javascript/soyutils_usegoog.js -O
cd ..

cd ..
