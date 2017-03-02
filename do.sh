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
JSCOMPILE_CMD="java -jar -Xms512m -Xmx1024m lib/closure-compiler/build/compiler.jar --flagfile=compiler.flags"
CKSUM_CMD="cksum" # chosen because it's available on most Linux/OS X installations
NODEJS_CMD="${NODEJS_CMD:-nodejs}"
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
    lib/closure-stylesheets/build/closure-stylesheets.jar \
    lib/closure-compiler/build/compiler.jar \
    lib/closure-compiler/contrib/externs/chrome_extensions.js \
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

e2e_assert_bc() {
  # Verify, or download the correct bc libraries.
  src/javascript/crypto/e2e/compatibility_tests/drivers/bc/download-libs.sh || { echo >&2 "Unable to install bouncy castle libraries"; exit 1; }
}

e2e_assert_nodejs() {
  # Check if nodejs is installed.
  type "$NODEJS_CMD" >/dev/null 2>&1 || { echo >&2 "Please install nodejs to run the compatibility tests."; exit 1; }
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
      echo "Using previous template build. Run ./do.sh clean if you want to rebuild the templates."
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

e2e_build_closure_lib_() {
  # $1 - Closure entry point
  # $2 - Filename
  # $3 - Additional source dir
  # $4 - [debug|optimized]
  # $5 - [webcrypto]
  ENTRY_POINT=$1
  FNAME=$2
  SRC_DIRS=( \
    src \
    lib/closure-library/closure/goog \
    lib/closure-library/third_party/closure/goog \
    lib/closure-templates-compiler lib/zlib.js/src \
    lib/typedarray )
  if [ -d "$3" ]; then
    SRC_DIRS+=("$3")
  fi
  jscompile_e2e="$JSCOMPILE_CMD"
  # Don't compile compatibility tests. They are a node.js and independent of this.
  jscompile_e2e+=" --js='!src/javascript/crypto/e2e/compatibility_tests/**.js'"
  # Don't compile the gmonkeystub.js. It is injected uncompiled by the extension.
  jscompile_e2e+=" --js='!src/javascript/crypto/e2e/extension/helper/gmonkeystub.js'"
  for var in "${SRC_DIRS[@]}"
  do
    jscompile_e2e+=" --js='$var/**.js' --js='!$var/**_test.js' --js='!$var/**_perf.js'"
  done
  jscompile_e2e+=" --js='!lib/closure-library/closure/goog/demos/**.js'"
  if [ "$4" == "debug" ]; then
     jscompile_e2e+=" --debug --formatting=PRETTY_PRINT -O WHITESPACE_ONLY"
  elif [ "$4" == "optimized" ]; then
     jscompile_e2e+=" -O ADVANCED"
  fi
  if [ "$5" == "webcrypto" ]; then
     jscompile_e2e+=" --define=\"e2e.scheme.SignatureScheme.WEBCRYPTO_ALGORITHMS='ECDSA'\""
     jscompile_e2e+=" --define=\"e2e.scheme.EncryptionScheme.WEBCRYPTO_ALGORITHMS='ECDH'\""
  fi
  echo -n "."
  $jscompile_e2e --closure_entry_point "$ENTRY_POINT" --js_output_file "$FNAME"
}

e2e_build_jsmodule() {
  echo "Building JS module $1 into $BUILD_DIR/$1.js..."
  e2e_assert_dependencies
  set -e
  e2e_assert_jsdeps
  mkdir -p "$BUILD_DIR"
  if [ "$2" == "debug" ]; then
    echo "Debug mode enabled"
  fi
  e2e_build_closure_lib_ $1 "$BUILD_DIR/$1.js" "" $2;
  echo ""
  echo "Done."
}

e2e_build_library_prepare() {
  echo "Building End-To-End library into $BUILD_DIR/library..."
  e2e_assert_dependencies
  set -e
  e2e_assert_jsdeps
  BUILD_EXT_DIR="$BUILD_DIR/library"
  rm -rf "$BUILD_EXT_DIR"
  mkdir -p "$BUILD_EXT_DIR"
}

e2e_build_library() {
  e2e_build_library_prepare
  e2e_build_closure_lib_ "e2e.openpgp.Context2Impl" "$BUILD_EXT_DIR/end-to-end.compiled.js"
  e2e_build_closure_lib_ "e2e.openpgp.Context2Impl" "$BUILD_EXT_DIR/end-to-end.debug.js" "" "debug"
  echo -e "\nDone."
}

e2e_build_library_ctx1() {
  e2e_build_library_prepare
  e2e_build_closure_lib_ "e2e.openpgp.ContextImpl" "$BUILD_EXT_DIR/end-to-end-ctx1.compiled.js"
  e2e_build_closure_lib_ "e2e.openpgp.ContextImpl" "$BUILD_EXT_DIR/end-to-end-ctx1.debug.js" "" "debug"
  echo -e "\nDone."
}

e2e_build_library_webcrypto() {
  e2e_build_library_prepare
  e2e_build_closure_lib_ "e2e.openpgp.Context2Impl" "$BUILD_EXT_DIR/end-to-end-webcrypto.compiled.js" "" "" "webcrypto"
  # Debug mode seems to ignore the defines required to enable WebCrypto, so only compiled mode is supported.
  echo -e "\nDone."
}

e2e_build_library_ctx1_webcrypto() {
  e2e_build_library_prepare
  e2e_build_closure_lib_ "e2e.openpgp.ContextImpl" "$BUILD_EXT_DIR/end-to-end-ctx1-webcrypto.compiled.js" "" "" "webcrypto"
  # Debug mode seems to ignore the defines required to enable WebCrypto, so only compiled mode is supported.
  echo -e "\nDone."
}

e2e_build_library_all() {
  e2e_build_library_prepare
  e2e_build_closure_lib_ "e2e.openpgp.ContextImpl" "$BUILD_EXT_DIR/end-to-end-ctx1.compiled.js"
  e2e_build_closure_lib_ "e2e.openpgp.ContextImpl" "$BUILD_EXT_DIR/end-to-end-ctx1.debug.js" "" "debug"
  e2e_build_closure_lib_ "e2e.openpgp.Context2Impl" "$BUILD_EXT_DIR/end-to-end.compiled.js"
  e2e_build_closure_lib_ "e2e.openpgp.Context2Impl" "$BUILD_EXT_DIR/end-to-end.debug.js" "" "debug"
  echo -e "\nDone."
}

e2e_test_compat_e2e() {
  e2e_assert_nodejs
  e2e_assert_dependencies
  set -e
  e2e_assert_jsdeps
  BUILD_EXT_DIR="$BUILD_DIR/library"
  rm -rf "$BUILD_EXT_DIR"
  mkdir -p "$BUILD_EXT_DIR"
  echo -n "Building End-To-End debug library into $BUILD_DIR/library..."
  e2e_build_closure_lib_ "e2e.openpgp.ContextImpl" "$BUILD_EXT_DIR/end-to-end.debug.js" "" "debug"
  echo
  echo "Running compatibility tests..."
  TEST_ROOT="src/javascript/crypto/e2e/compatibility_tests"
  $NODEJS_CMD "$TEST_ROOT/drivers/e2e/run.js" "$BUILD_EXT_DIR/end-to-end.debug.js" "$TEST_ROOT/openpgp-interop/testcases"
  echo "Done."
}

e2e_test_compat_bc() {
  e2e_assert_dependencies
  set -e
  e2e_assert_bc
  echo "Running Bouncycastle compatibility tests..."
  ant -f src/javascript/crypto/e2e/compatibility_tests/drivers/bc/build.xml run
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
  if [ "$1" == "debug" ]; then
    echo "Debug mode enabled"
  fi
  # compile javascript files
  echo "Compiling JS files..."
  e2e_build_closure_lib_ "e2e.ext.bootstrap" "$BUILD_EXT_DIR/launcher_binary.js" "$BUILD_TPL_DIR" "$1"
  e2e_build_closure_lib_ "e2e.ext.helper.bootstrap" "$BUILD_EXT_DIR/helper_binary.js" "$BUILD_TPL_DIR" "$1"
  e2e_build_closure_lib_ "e2e.ext.ui.prompt.bootstrap" "$BUILD_EXT_DIR/prompt_binary.js" "$BUILD_TPL_DIR" "$1"
  e2e_build_closure_lib_ "e2e.ext.ui.settings.bootstrap" "$BUILD_EXT_DIR/settings_binary.js" "$BUILD_TPL_DIR" "$1"
  e2e_build_closure_lib_ "e2e.ext.ui.welcome.bootstrap" "$BUILD_EXT_DIR/welcome_binary.js" "$BUILD_TPL_DIR" "$1"
  # compile css files
  csscompile_e2e="java -jar -Xms512m -Xmx1024m lib/closure-stylesheets/build/closure-stylesheets.jar src/javascript/crypto/e2e/extension/ui/styles/base.css"
  echo "Compiling CSS files..."
  $csscompile_e2e "$SRC_EXT_DIR/ui/glass/glass.css" > "$BUILD_EXT_DIR/glass_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/prompt/prompt.css" > "$BUILD_EXT_DIR/prompt_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/dialogs/overlay/dialog.css" "$SRC_EXT_DIR/ui/settings/settings.css" > "$BUILD_EXT_DIR/settings_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/dialogs/overlay/dialog.css" "$SRC_EXT_DIR/ui/welcome/welcome.css" > "$BUILD_EXT_DIR/welcome_styles.css"
  echo "Copying extension files..."
  # copy extension files
  cp -fr "$SRC_EXT_DIR/images" "$BUILD_EXT_DIR"
  cp -fr "$SRC_EXT_DIR/_locales" "$BUILD_EXT_DIR"
  find "$SRC_EXT_DIR/ui" -regex .*.html -not -regex .*_test.html -exec cp -f "{}" "$BUILD_EXT_DIR" \;
  cp -f "$SRC_EXT_DIR/helper/gmonkeystub.js" "$BUILD_EXT_DIR"
  cp -f "$SRC_EXT_DIR/extension_manifest.json" "$BUILD_EXT_DIR/manifest.json"
  echo "Done."
}

e2e_build_app() {
  e2e_assert_dependencies
  set -e
  e2e_assert_jsdeps
  e2e_assert_templates

  BUILD_EXT_DIR="$BUILD_DIR/app"
  echo "Building End-To-End app to $BUILD_EXT_DIR"
  rm -rf "$BUILD_EXT_DIR"
  mkdir -p "$BUILD_EXT_DIR"
  SRC_EXT_DIR="src/javascript/crypto/e2e/extension"
  # compile javascript files
  if [ "$1" == "debug" ]; then
    echo "Debug mode enabled"
  fi
  echo "Compiling JS files..."
  e2e_build_closure_lib_ "e2e.ext.bootstrap" "$BUILD_EXT_DIR/launcher_binary.js" "$BUILD_TPL_DIR" "$1"
  e2e_build_closure_lib_ "e2e.ext.helper.bootstrap" "$BUILD_EXT_DIR/helper_binary.js" "$BUILD_TPL_DIR" "$1"
  e2e_build_closure_lib_ "e2e.ext.ui.prompt.bootstrap" "$BUILD_EXT_DIR/prompt_binary.js" "$BUILD_TPL_DIR" "$1"
  e2e_build_closure_lib_ "e2e.ext.ui.settings.bootstrap" "$BUILD_EXT_DIR/settings_binary.js" "$BUILD_TPL_DIR" "$1"
  e2e_build_closure_lib_ "e2e.ext.ui.welcome.bootstrap" "$BUILD_EXT_DIR/welcome_binary.js" "$BUILD_TPL_DIR" "$1"
  e2e_build_closure_lib_ "e2e.ext.ui.webview.bootstrap" "$BUILD_EXT_DIR/webview_binary.js" "$BUILD_TPL_DIR" "$1"
  # compile css files
  csscompile_e2e="java -jar lib/closure-stylesheets/build/closure-stylesheets.jar src/javascript/crypto/e2e/extension/ui/styles/base.css"
  echo "Compiling CSS files..."
  $csscompile_e2e "$SRC_EXT_DIR/ui/glass/glass.css" > "$BUILD_EXT_DIR/glass_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/prompt/prompt.css" > "$BUILD_EXT_DIR/prompt_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/settings/settings.css" > "$BUILD_EXT_DIR/settings_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/welcome/welcome.css" > "$BUILD_EXT_DIR/welcome_styles.css"
  $csscompile_e2e "$SRC_EXT_DIR/ui/webview/webview.css" > "$BUILD_EXT_DIR/webview_styles.css"
  echo "Copying app files..."
  # copy extension files
  cp -fr "$SRC_EXT_DIR/images" "$BUILD_EXT_DIR"
  cp -fr "$SRC_EXT_DIR/_locales" "$BUILD_EXT_DIR"
  find "$SRC_EXT_DIR/ui" -regex .*.html -not -regex .*_test.html -exec cp -f "{}" "$BUILD_EXT_DIR" \;
  cp -f "$SRC_EXT_DIR/helper/gmonkeystub.js" "$BUILD_EXT_DIR"
  cp -f "$SRC_EXT_DIR/app_manifest.json" "$BUILD_EXT_DIR/manifest.json"
  echo "Done."
}

e2e_build_clean() {
  echo "Cleaning all builds..."
  rm -rfv "$BUILD_DIR"
  rm -rfv "src/javascript/crypto/e2e/compatibility_tests/drivers/bc/lib"
  rm -rfv "src/javascript/crypto/e2e/compatibility_tests/drivers/bc/build"
  echo "Done."
}

e2e_clean_deps() {
  echo "Removing all build dependencies. Install them with ./do.sh install_deps."
  rm -rfv lib
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

e2e_build_docs() {
  DOSSIER_JAR="lib/js-dossier/bazel-bin/src/java/com/github/jsdossier/dossier_deploy.jar"
  rm -rf docs/*
  if [ ! -f $DOSSIER_JAR ]; then
    if [ -z `which bazel` ]; then
      echo "Bazel is not installed. Bazel is needed by js-dossier to build the documentation."
      echo "Follow instructions at http://bazel.io/docs/install.html to install."
      echo "Make sure 'bazel' command line tool is available."
      RETVAL=1
      exit
    else
      pushd lib/js-dossier
      ./gendossier.sh -r
      popd
    fi
  fi
  e2e_build_templates
  java -jar $DOSSIER_JAR -c lib/docs-build/dossier-config.json
  RETVAL=$?
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
  build_extension)
    e2e_build_extension $1;
    ;;
  build_app)
    e2e_build_app $1;
    ;;
  build_library)
    e2e_build_library;
    ;;
  build_library_ctx1)
    e2e_build_library_ctx1;
    ;;
  build_library_all)
    e2e_build_library_all;
    ;;
  build_library_webcrypto)
    e2e_build_library_webcrypto;
    ;;
  build_library_ctx1_webcrypto)
    e2e_build_library_ctx1_webcrypto;
    ;;
  test_compat_e2e)
    e2e_test_compat_e2e;
    ;;
  test_compat_bc)
    e2e_test_compat_bc;
    ;;
  build_templates)
    e2e_build_templates;
    ;;
  build_jsmodule)
    e2e_build_jsmodule $*;
    ;;
  clean)
    e2e_build_clean;
    ;;
  clean_deps)
    e2e_clean_deps;
    ;;
  testserver)
    e2e_testserver $*;
    ;;
  lint)
    e2e_lint $*;
    ;;
  build_docs)
    e2e_build_docs;
    ;;
  deps)
    e2e_generate_deps;
    ;;
  *)
    echo "Usage: $0 {build_app|build_extension|build_library|build_library_ctx1|build_library_all|build_library_webcrypto|build_library_ctx1_webcrypto|build_templates|build_docs|clean|check_deps|clean_deps|install_deps|testserver|test_compat_e2e|test_compat_bc|lint} [debug]"
    RETVAL=1
esac

exit $RETVAL
