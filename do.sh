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
#  * @fileoverview Shell script to facilitate build-related tasks for End-To-End
#  *
#  * @author koto@google.com (Krzysztof Kotowicz)
#  */
PYTHON_CMD="python"
JSCOMPILE_CMD="$PYTHON_CMD lib/closure-library/closure/bin/build/closurebuilder.py -c lib/closure-compiler/compiler.jar"
BUILD_DIR="build"
BUILD_TPL_DIR="$BUILD_DIR/templates"
SRC_REPO_URL="https://code.google.com/p/end-to-end/"
cd ${0%/*}

e2e_assert_dependencies() {
  # Check if required binaries are present.
  type "$PYTHON_CMD" >/dev/null 2>&1 || { echo >&2 "Python is required to build End-To-End"; exit 1; }
  type java >/dev/null 2>&1 || { echo >&2 "Java is required to build End-To-End"; exit 1; }
  jversion=$(java -version 2>&1 | grep version | awk -F '"' '{print $2}')
  if [[ $jversion < "1.7" ]]; then
    echo "Java 1.7 or higher is required to build End-To-End."
    exit 1
  fi
  # Check if required files are present.
  files=( lib/closure-library/closure/bin/build/closurebuilder.py \
    lib/closure-library \
    lib/closure-templates \
    lib/typedarray \
    lib/zlib.js \
    lib/closure-stylesheets-20111230.jar \
    lib/closure-compiler/compiler.jar \
  )
  for var in "${files[@]}"
  do
    if [ ! -e $var ]; then
      echo >&2 "Download libraries needed to build first. Use $0 install_deps."
      exit 1
    fi
  done
  echo "All dependencies met."
}

e2e_build_templates() {
  e2e_assert_dependencies
  mkdir -p "$BUILD_TPL_DIR"
  rm -rf "$BUILD_TPL_DIR/*"
  # Compile soy templates
  echo "Compiling Soy templates..."
  find src -name '*.soy' -exec java -jar lib/closure-templates-compiler/SoyToJsSrcCompiler.jar \
  --shouldProvideRequireSoyNamespaces --shouldGenerateJsdoc --shouldDeclareTopLevelNamespaces --isUsingIjData --srcs {} \
  --outputPathFormat "$BUILD_TPL_DIR/{INPUT_DIRECTORY}{INPUT_FILE_NAME}.js" \;
  echo "Done."
}

e2e_assert_templates() {
  if [ ! -d $BUILD_TPL_DIR ]; then
    e2e_build_templates
  fi
}

e2e_build_library() {
  e2e_assert_dependencies
  set -e
  e2e_assert_templates

  BUILD_EXT_DIR="$BUILD_DIR/library"
  echo "Building End-To-End library into $BUILD_EXT_DIR ..."
  mkdir -p "$BUILD_EXT_DIR"
  SRC_DIRS=( src lib/closure-library lib/closure-templates/javascript $BUILD_TPL_DIR \
    lib/zlib.js/src lib/typedarray )
  # See https://developers.google.com/closure/library/docs/closurebuilder
  jscompile_e2e="$JSCOMPILE_CMD"
  for var in "${SRC_DIRS[@]}"
  do
    jscompile_e2e+=" --root $var"
  done
  $jscompile_e2e -o compiled -n "e2e.openpgp.ContextImpl" > "$BUILD_EXT_DIR/end-to-end.compiled.js"
  $jscompile_e2e -o script -n "e2e.openpgp.ContextImpl"  -f --debug \
      -f --formatting=PRETTY_PRINT > "$BUILD_EXT_DIR/end-to-end.debug.js"
  echo "Done."
}

e2e_build_extension() {
  e2e_assert_dependencies
  set -e
  e2e_assert_templates
  BUILD_EXT_DIR="$BUILD_DIR/extension"
  mkdir -p "$BUILD_EXT_DIR"
  echo "Building End-To-End extension to $BUILD_EXT_DIR"
  SRC_EXT_DIR="src/javascript/crypto/e2e/extension"
  SRC_DIRS=( src lib/closure-library lib/closure-templates/javascript $BUILD_TPL_DIR \
    lib/zlib.js/src lib/typedarray )

  # See https://developers.google.com/closure/library/docs/closurebuilder
  jscompile_e2e="$JSCOMPILE_CMD"
  for var in "${SRC_DIRS[@]}"
  do
    jscompile_e2e+=" --root $var"
  done
  csscompile_e2e="java -jar lib/closure-stylesheets-20111230.jar src/javascript/crypto/e2e/extension/ui/styles/base.css"
  # compile javascript files
  echo "Compiling JS files..."
  $jscompile_e2e -o compiled -i "$SRC_EXT_DIR/bootstrap.js" > "$BUILD_EXT_DIR/launcher_binary.js"
  $jscompile_e2e -o compiled -i "$SRC_EXT_DIR/helper/helper.js" > "$BUILD_EXT_DIR/helper_binary.js"
  $jscompile_e2e -o compiled -i "$SRC_EXT_DIR/ui/glass/bootstrap.js" > "$BUILD_EXT_DIR/glass_binary.js"
  $jscompile_e2e -o compiled -i "$SRC_EXT_DIR/ui/prompt/prompt.js" > "$BUILD_EXT_DIR/prompt_binary.js"
  $jscompile_e2e -o compiled -i "$SRC_EXT_DIR/ui/settings/settings.js" > "$BUILD_EXT_DIR/settings_binary.js"
  $jscompile_e2e -o compiled -i "$SRC_EXT_DIR/ui/welcome/welcome.js" > "$BUILD_EXT_DIR/welcome_binary.js"
  # compile css files
  echo "Compiling CSS files..."
  $csscompile_e2e "$SRC_EXT_DIR/ui/glass/glass.css" > "$BUILD_EXT_DIR/glass_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/prompt/prompt.css" > "$BUILD_EXT_DIR/prompt_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/settings/settings.css" > "$BUILD_EXT_DIR/settings_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/welcome/welcome.css" > "$BUILD_EXT_DIR/welcome_styles.css"
  echo "Copying extension files..."
  # copy extension files
  cp -fr "$SRC_EXT_DIR/images" "$BUILD_EXT_DIR"
  cp -fr "$SRC_EXT_DIR/_locales" "$BUILD_EXT_DIR"
  find "$SRC_EXT_DIR/ui" -regex .*.html -exec cp -f "{}" "$BUILD_EXT_DIR" \;
  cp -f "$SRC_EXT_DIR/helper/gmonkeystub.js" "$BUILD_EXT_DIR"
  cp -f "$SRC_EXT_DIR/manifest.json" "$BUILD_EXT_DIR"
  echo "Done."
}

e2e_build_clean() {
  echo "Cleaning all builds..."
  rm -rfv "$BUILD_DIR"
  echo "Done."
}

e2e_install_deps() {
  echo "Installing build dependencies..."
  ./download-libs.sh
  if [ ! -d src/.git ]; then
    git clone "$SRC_REPO_URL" src/
  fi
  echo "Done."
}

e2e_testserver() {
  echo "Generating build/test_js_deps-runfiles.js file..."
  mkdir -p "$BUILD_DIR"
  $PYTHON_CMD lib/closure-library/closure/bin/build/depswriter.py \
    --root_with_prefix="build/templates/ ../../../build/templates/" \
    --root_with_prefix="src/javascript/crypto/e2e/ ../crypto/e2e/" \
    --root_with_prefix="lib/closure-templates/javascript/ ../../../../lib/closure-templates/javascript" \
    --root_with_prefix="lib/zlib.js/ ../../../lib/zlib.js/" \
    > "$BUILD_DIR/test_js_deps-runfiles.js"

  rm "$BUILD_DIR/all_tests.js"
  echo "Starting the End-To-End test server (Press Ctrl-C to stop)..."
  $PYTHON_CMD test_server.py
  echo "Done."
}

e2e_update() {
  echo "Updating End-To-End sources from upstream..."
  if [ ! -d src/.git ]; then
    git clone "$SRC_REPO_URL" src/
  fi
  cd src
  git pull origin master
  cd ..
  echo "Done."
}

RETVAL=0

case "$1" in
  check_deps)
    e2e_assert_dependencies;
    ;;
  install_deps)
    e2e_install_deps;
    e2e_update;
    ;;
  update)
    e2e_update;
    ;;
  build_extension)
    e2e_build_extension;
    ;;
  build_library)
    e2e_build_library;
    ;;
  build_templates)
    e2e_build_templates;
    ;;
  clean)
    e2e_build_clean;
    ;;
  testserver)
    e2e_testserver;
    ;;
  *)
    echo "Usage: $0 {build_extension|build_library|build_templates|clean|check_deps|install_deps|update|testserver}"
    RETVAL=1
esac

exit $RETVAL
