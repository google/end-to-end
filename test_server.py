# Copyright 2013 Google Inc. All Rights Reserved.
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
"""Runs a test server for End-To-End."""

__author__ = "koto@google.com (Krzysztof Kotowicz)"

import BaseHTTPServer
import cgi
import fnmatch
import os
import os.path
import SimpleHTTPServer
import StringIO
import sys

PORT=8000
if len(sys.argv) > 1:
  PORT = int(sys.argv[1])

server_address = ("127.0.0.1", PORT)

# ./do.sh testserver generates the file
DEPS_FILE="build/test_js_deps-runfiles.js"
ALL_JSTESTS_FILE="build/all_tests.js"

class TestServerRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
  """Request handler for End-To-End test server."""

  DIRECTORY_MAP = {
      "/javascript/closure/": "lib/closure-library/closure/goog/",
      "/javascript/crypto/e2e/": "src/javascript/crypto/e2e/",
      "/third_party/closure/": "lib/closure-library/third_party/closure/",
  }

  def get_test_files(self):
    test_files = []
    for root, _, files in os.walk("src/"):
      for f in fnmatch.filter(files, "*_test.html"):
        test_files.append(os.path.join(root, f))
    return test_files

  def generate_all_tests_file(self):
    if os.path.exists(ALL_JSTESTS_FILE):
      return
    with open(ALL_JSTESTS_FILE, 'wb') as f:
      f.write('var _allTests=')
      f.write(repr(self.get_test_files()))
      f.write(';')

  def list_directory(self, path):
    """Lists only src/**/_test.html files."""
    test_files = self.get_test_files()
    out = StringIO.StringIO()
    out.write("<h2>End-To-End test server</h2>")
    out.write('<h3>Test suite</h3>')
    out.write('<a href=\"%s\">%s</a>\n' % ('/all_tests.html', 'all_tests.html'))
    out.write('<h3>Individual tests</h3>')
    out.write("<ul>")
    for f in test_files:
      out.write("<li><a href=\"%s\">%s</a>\n" % (f, cgi.escape(f)))
    out.write("</ul>")
    out.seek(0)
    self.send_response(200)
    self.send_header("Content-type", "text/html")
    self.end_headers()
    return out

  def translate_path(self, path):
    """Serves files from different directories."""
    if path.endswith("test_js_deps-runfiles.js"):
      return DEPS_FILE
    if path == '/' + ALL_JSTESTS_FILE:
      self.generate_all_tests_file()
      return ALL_JSTESTS_FILE
    for prefix, dest_dir in TestServerRequestHandler.DIRECTORY_MAP.items():
      if path.startswith(prefix):
        return dest_dir + path[len(prefix):]
    return SimpleHTTPServer.SimpleHTTPRequestHandler.translate_path(
        self, path)

httpd = BaseHTTPServer.HTTPServer(server_address, TestServerRequestHandler)
print "Starting test server at http://%s:%d" % server_address
httpd.serve_forever()
