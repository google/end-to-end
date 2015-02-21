#!/usr/bin/env sh
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
  git clone https://github.com/google/closure-library
fi

# checkout zlib.js
if [ ! -d zlib.js/.git ]; then
  git clone https://github.com/imaya/zlib.js zlib.js
  mkdir typedarray
  ln -s ../zlib.js/define/typedarray/use.js typedarray/use.js
fi

# checkout closure compiler
if [ ! -d closure-compiler/.git ]; then
  if [ -d closure-compiler ]; then # remove binary release directory
    rm -rf closure-compiler 
  fi
  git clone https://github.com/google/closure-compiler
  cd closure-compiler
  ant jar
  cd ..
fi

# checkout closure templates compiler
if [ ! -d closure-templates ]; then
  git clone https://github.com/google/closure-templates
  cd closure-templates
  # hack because things there's a warning on OSX if you're using Java 8
  sed -i -e 's_<compilerarg value="-Werror"/>__' build.xml
  ant SoyToJsSrcCompiler generated-soyutils
  ln -s build/javascript/soyutils_usegoog.js build/
  cd ..
fi

# checkout css compiler
if [ ! -d closure-stylesheets ]; then
  git clone https://github.com/google/closure-stylesheets
  cd closure-stylesheets
  ant
  cd ..
fi

if [ ! -f chrome_extensions.js ]; then
  ln -s closure-compiler/contrib/externs/chrome_extensions.js
fi

cd ..

cd ..
