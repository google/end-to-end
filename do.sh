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
JSCOMPILE_CMD="java -jar lib/closure-compiler/build/compiler.jar --flagfile=compiler.flags"
CKSUM_CMD="cksum" # chosen because it's available on most Linux/OS X installations
BUILD_DIR="build"
BUILD_TPL_DIR="$BUILD_DIR/templates"
cd ${0%/*}

e2e_assert_dependencies() {
  # Check if required binaries are present.
  type "$PYTHON_CMD" >/dev/null 2>&1 || { echo >&2 "Python is required to build End-To-End."; exit 1; }
  type ant >/dev/null 2>&1 || { echo >&2 "Ant is required to build End-To-End."; exit 1; }
  type java >/dev/null 2>&1 || { echo >&2 "Java is required to build End-To-End."; exit 1; }
  jversion=$(java -version 2>&1 | grep version | awk -F '"' '{print $2}')
  if [[ $jversion < "1.7" ]]; then
    echo "Java 1.7 or higher is required to build End-To-End."
    exit 1
  fi
  # Check if required files are present.
  files=(lib/closure-library \
    lib/closure-templates-compiler \
    lib/typedarray \
    lib/zlib.js \
    lib/closure-stylesheets-20111230.jar \
    lib/closure-compiler/build/compiler.jar \
    lib/chrome_extensions.js \
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

e2e_get_file_cksum() {
  # creates a checksum of a given file spec
  # no-op if $CKSUM_CMD is not available
  type $CKSUM_CMD >/dev/null 2>&1 && (find src -name $1 | sort | xargs $CKSUM_CMD | $CKSUM_CMD) || true
}

e2e_build_templates() {
  e2e_assert_dependencies
  set -e
  mkdir -p "$BUILD_TPL_DIR"
  rm -rf "$BUILD_TPL_DIR/*"
  # Compile soy templates
  echo "Compiling Soy templates..."
  rm -f "$BUILD_TPL_DIR/cksum"
  e2e_get_file_cksum '*.soy' > "$BUILD_TPL_DIR/cksum"
  find src -name '*.soy' -exec java -jar lib/closure-templates-compiler/SoyToJsSrcCompiler.jar \
  --shouldProvideRequireSoyNamespaces --shouldGenerateJsdoc --shouldDeclareTopLevelNamespaces --isUsingIjData --srcs {} \
  --outputPathFormat "$BUILD_TPL_DIR/{INPUT_DIRECTORY}{INPUT_FILE_NAME}.js" \;
  echo "Done."
}

e2e_assert_templates() {
  if [ ! -d $BUILD_TPL_DIR ]; then
    e2e_build_templates
  else
    # If cmp is unavailable, just ignore the check, instead of exiting
    type cmp >/dev/null 2>&1 && (e2e_get_file_cksum '*.soy' | cmp "$BUILD_TPL_DIR/cksum" - >/dev/null 2>&1) || true
    if [ -f "$BUILD_TPL_DIR/cksum" -a $? -eq 0 ] ; then
      echo "Using previous template build - ./do.sh clean if you with to rebuild the templates."
    else
      echo "Template files changed since last build. Rebuilding..."
      e2e_build_templates
    fi
  fi
}

e2e_assert_jsdeps() {
  if [ ! -f "$BUILD_DIR/deps.js" ]; then
    e2e_generate_jsdeps
  fi
}

e2e_build_library() {
  e2e_assert_dependencies
  set -e
  e2e_assert_jsdeps

  BUILD_EXT_DIR="$BUILD_DIR/library"
  echo "Building End-To-End library into $BUILD_EXT_DIR ..."
  rm -rf "$BUILD_EXT_DIR"
  mkdir -p "$BUILD_EXT_DIR"
  SRC_DIRS=( src lib/closure-library lib/zlib.js/src lib/typedarray )
  jscompile_e2e="$JSCOMPILE_CMD"
  for var in "${SRC_DIRS[@]}"
  do
    jscompile_e2e+=" --js='$var/**.js' --js='!$var/**_test.js'"
  done
  jscompile_e2e+=" --js='!src/javascript/crypto/e2e/extension/*.js'"
  echo -n "." && $jscompile_e2e --closure_entry_point "e2e.openpgp.ContextImpl" --js_output_file "$BUILD_EXT_DIR/end-to-end.compiled.js"
  echo -n "." && $jscompile_e2e --closure_entry_point "e2e.openpgp.ContextImpl" --debug --formatting=PRETTY_PRINT --js_output_file "$BUILD_EXT_DIR/end-to-end.debug.js"
  echo ""
  echo "Done."
}

e2e_build_extension() {
  e2e_assert_dependencies
  set -e
  e2e_assert_jsdeps
  e2e_assert_templates

  BUILD_EXT_DIR="$BUILD_DIR/extension"
  echo "Building End-To-End extension to $BUILD_EXT_DIR"
  rm -rf "$BUILD_EXT_DIR"
  mkdir -p "$BUILD_EXT_DIR"
  SRC_EXT_DIR="src/javascript/crypto/e2e/extension"
  SRC_DIRS=( src lib/closure-library lib/closure-templates-compiler $BUILD_TPL_DIR \
    lib/zlib.js/src lib/typedarray )

  jscompile_e2e="$JSCOMPILE_CMD"
  for var in "${SRC_DIRS[@]}"
  do
    jscompile_e2e+=" --js='$var/**.js' --js='!$var/**_test.js'"
  done
  csscompile_e2e="java -jar lib/closure-stylesheets-20111230.jar src/javascript/crypto/e2e/extension/ui/styles/base.css"
  # compile javascript files
  echo "Compiling JS files..."
  if [ "$1" == "debug" ]; then
    jscompile_e2e+=" --debug --formatting=PRETTY_PRINT"
  fi
  echo -n "." && $jscompile_e2e --closure_entry_point "e2e.ext.bootstrap" --js_output_file "$BUILD_EXT_DIR/launcher_binary.js"
  echo -n "." && $jscompile_e2e --closure_entry_point "e2e.ext.Helper" --js_output_file "$BUILD_EXT_DIR/helper_binary.js"
  echo -n "." && $jscompile_e2e --closure_entry_point "e2e.ext.ui.glass.bootstrap" --js_output_file "$BUILD_EXT_DIR/glass_binary.js"
  echo -n "." && $jscompile_e2e --closure_entry_point "e2e.ext.ui.Prompt" --js_output_file "$BUILD_EXT_DIR/prompt_binary.js"
  echo -n "." && $jscompile_e2e --closure_entry_point "e2e.ext.ui.Settings" --js_output_file "$BUILD_EXT_DIR/settings_binary.js"
  echo -n "." && $jscompile_e2e --closure_entry_point "e2e.ext.ui.Welcome" --js_output_file "$BUILD_EXT_DIR/welcome_binary.js"
  echo ""
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
  find "$SRC_EXT_DIR/ui" -regex .*.html -not -regex .*_test.html -exec cp -f "{}" "$BUILD_EXT_DIR" \;
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
  set -e
  echo "Installing build dependencies..."
  ./download-libs.sh
  echo "Done."
}

e2e_generate_jsdeps() {
  e2e_assert_templates
  $PYTHON_CMD lib/closure-library/closure/bin/build/depswriter.py \
    --root_with_prefix="build/templates/ build/templates/" \
    --root_with_prefix="src/javascript/crypto/e2e/ src/javascript/crypto/e2e/" \
    --root_with_prefix="lib/closure-templates-compiler/ lib/closure-templates-compiler/" \
    --root_with_prefix="lib/zlib.js/ lib/zlib.js/" \
    > "$BUILD_DIR/deps.js"
}

e2e_testserver() {
  e2e_assert_templates
  echo "Generating build/test_js_deps-runfiles.js file..."
  mkdir -p "$BUILD_DIR"
  $PYTHON_CMD lib/closure-library/closure/bin/build/depswriter.py \
    --root_with_prefix="build/templates/ ../../../build/templates/" \
    --root_with_prefix="src/javascript/crypto/e2e/ ../crypto/e2e/" \
    --root_with_prefix="lib/closure-templates-compiler/ ../../../../lib/closure-templates-compiler/" \
    --root_with_prefix="lib/zlib.js/ ../../../lib/zlib.js/" \
    > "$BUILD_DIR/test_js_deps-runfiles.js"

  rm -f "$BUILD_DIR/all_tests.js"
  echo "Starting the End-To-End test server (Press Ctrl-C to stop)..."
  $PYTHON_CMD test_server.py $*
  echo "Done."
}

e2e_lint() {
  if [ -z `which gjslint` ]; then
    echo "Closure Linter is not installed."
    echo "Follow instructions at https://developers.google.com/closure/utilities/docs/linter_howto to install (root access is needed)."
    RETVAL=1
  else
    echo "Running Closure Linter..."
    if [ -z "$1" ]; then
      ADDITIONAL="-r src/javascript/crypto/e2e"
    else
      ADDITIONAL=$*
    fi
    gjslint --strict --closurized_namespaces=goog,e2e --limited_doc_files=_test.js $ADDITIONAL
    RETVAL=$?
  fi
}

e2e_build() {
  TARGET=$1
  shift
  if [ "$TARGET" == "extension" ]; then
    e2e_build_extension $*;
  elif [ "$TARGET" == "library" ]; then
    e2e_build_library $*;
  elif [ "$TARGET" == "templates" ]; then
    e2e_build_templates $*;
  else
    echo "Invalid build target $TARGET"
    exit 1
  fi
}

RETVAL=0

CMD=$1
shift

case "$CMD" in
  check_deps)
    e2e_assert_dependencies;
    ;;
  install_deps)
    e2e_install_deps;
    ;;
  build)
    e2e_build $*;
    ;;
  build_extension)
    e2e_build_extension;
    ;;
  build_extension_debug)
    e2e_build_extension "debug";
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
    e2e_testserver $*;
    ;;
  lint)
    e2e_lint $*;
    ;;
  deps)
    e2e_generate_deps;
    ;;
  *)
    echo "Usage: $0 {build_extension|build_extension_debug|build_library|build_templates|clean|check_deps|install_deps|testserver|lint}"
    RETVAL=1
esac

exit $RETVAL
