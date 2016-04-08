/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


'use strict';

/**
 * A standalone nodejs script that runs a directory of basic
 * declarative OpenPGP testcases against the e2e library.
 *
 * Invoke as: nodejs run.js <path/to/e2e.js> <path/to/testcases>
 *
 * The e2e.js argument should point to a compiled e2e library.
 *
 * The testcases argument may be a directory, in which case any
 * testcases found under it is run. It may also be a path to a json
 * testcase declaration, in which case only that test is run.
 *
 * The format of a testcase is documented in the README.md file in
 * this directory.
 */

(function() {

  var fs = require('fs');
  var path = require('path');
  var assert = require('assert');
  var crypto_nodejs = require('crypto');

  /* holds all testcases */
  var tests = [];

  /* counter keeps track of current test. */
  var testIndex = 0;

  /* timer to interrupt async tests if they take too long. */
  var testTimer = null;

  var args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('nodejs run.js <path/to/e2e.js> <path/to/testcases>');
    process.exit(1);
  }

  var e2e_library = args.shift();
  var testRoot = args.shift();

  /* This global function is used within the library */
  global.crypto = {
    'getRandomValues': function(array) {
      var tmp = crypto_nodejs.randomBytes(array.buffer.byteLength);
      var dv = new DataView(array.buffer);
      for (var i = 0; i < tmp.length; i++) {
        dv.setUint8(i, tmp[i]);
      }
    }
  };


  /**
   * Sweeps through the provided directory and calls the provided function
   * on each file.
   * @param {string} root The root of the directory.
   * @param {function(string)} cb The function to call for each file
   *     found under the directory.
   */
  var fileFinder = function(root, cb) {
    fs.readdirSync(root).forEach(function(p) {
      if (/^\./.test(p)) {
        return;
      }
      var fullpath = path.join(root, p);
      var stat = fs.statSync(fullpath);
      if (stat.isFile()) {
        cb(fullpath);
      } else if (stat.isDirectory()) {
        fileFinder(fullpath, cb);
      }
    });
  };


  /**
   * Adds a new test case if it finds a testcase declaration.
   * @param {string} filePath is the path to a candidate file.
   */
  var collectTest = function(filePath) {
    var found = filePath.match(/^(.*)\.json$/);
    if (found === null) {
      return;
    }
    var info = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    info.baseName = found[1];
    info.baseDir = path.dirname(filePath);
    tests.push(info);
  };


  /**
   * Helper function that reads a public/private key.
   * @param {string} path The path to the key file.
   * @return {!e2e.openpgp.block.TransferableKey} A validated key from the file.
   */
  var readKey = function(path) {
    var data = fs.readFileSync(path, 'utf-8');
    var result =
        global.e2e.openpgp.block.factory.parseAsciiAllTransferableKeys(data);
    assert.equal(result.length, 1);
    var key = result[0];
    key.processSignatures();
    return key;
  };


  /**
   * Helper function that unlocks a secret key.
   * @param {!e2e.openpgp.packet.Key} key The secret key to unlock.
   * @param {string} passphrase The passphrase to use.
   * @return {!e2e.openpgp.packet.Key} The same key that was passed in.
   */
  var unlock = function(key, passphrase) {
    var asbytes = global.e2e.stringToByteArray(passphrase);
    key.cipher.unlockKey(asbytes);
    return key;
  };


  /**
   * Reads a public key, and verifies the result against information
   * provided by the testcase.
   * @param {!Object} info The parsed json file with the test case info.
   * @param {function()} done A function to call once the test completes.
   */
  var runImportTest = function(info, done) {
    var key = readKey(info.baseName + '.asc');
    var fp =
        new Buffer(key.keyPacket.toKeyPacketInfo().fingerprint).toString('hex');
    if (info.expected_fingerprint != null) {
      assert.equal(fp, info.expected_fingerprint);
    }
    if (info.expected_uids != null) {
      assert.deepEqual(key.getUserIds(), info.expected_uids);
    }
    var subkeys = key.subKeys;
    if (info.expected_subkeys != null) {
      assert.equal(subkeys.length, info.expected_subkeys.length);
      subkeys.forEach(function(subkey, idx) {
        var expectedfp = info.expected_subkeys[idx].expected_fingerprint;
        if (expectedfp != null) {
          var subkeyfp = new Buffer(subkey.toKeyPacketInfo().fingerprint)
              .toString('hex');
          assert.equal(subkeyfp, expectedfp);
        }
      });
    }
    done();
  };


  /**
   * Decrypts a message and verifies the result against information
   * provided by the testcase.
   * @param {!Object} info The parsed json file with the test case info.
   * @param {function()} done A function to call once the test completes.
   */
  var runDecryptTest = function(info, done) {
    var messageData = fs.readFileSync(info.baseName + '.asc', 'utf-8');
    var message =
        global.e2e.openpgp.block.factory.parseAsciiMessage(messageData);
    assert(typeof info.decryptKey == 'string', 'Missing decryptKey field');
    var decryptCert = readKey(path.join(info.baseDir, info.decryptKey));
    // If the optional public key is available, the message should also
    // be signed by this public key.
    var verifyCert = null;
    if (typeof info.verifyKey == 'string') {
      verifyCert = readKey(path.join(info.baseDir, info.verifyKey));
    }

    var result = message.decrypt(function(keyid) {
      if (global.e2e.compareByteArray(decryptCert.keyPacket.keyId, keyid)) {
        return global.e2e.async.Result.toResult(
            unlock(decryptCert.keyPacket, info.passphrase).cipher);
      }
      var ret = null;
      if (decryptCert.subKeys != null) {
        decryptCert.subKeys.forEach(function(subkey) {
          if (global.e2e.compareByteArray(subkey.keyId, keyid)) {
            ret = unlock(subkey, info.passphrase).cipher;
          }
        });
      }
      return global.e2e.async.Result.toResult(ret);
    }, null);

    result.then(function(message) {
      message = message.getLiteralMessage(message);
      if (info.filename != null) {
        assert.equal(info.filename, message.getFilename());
      }
      if (info.timestamp != null) {
        assert.equal(info.timestamp, message.getTimestamp());
      }
      if (info.textcontent != null) {
        assert.equal(
            new Buffer(message.getData()).toString('utf-8'), info.textcontent);
      }
      if (verifyCert != null) {
        return message.verify([verifyCert]).then(function(verify) {
          assert.equal(verify.success.length, 1, 'No successful verifications');
          assert.equal(verify.failure.length, 0, 'Unexpected failures');
        });
      }
    }).then(done);
  };

  var RUNNERS = {
    'import' : runImportTest,
    'decrypt' : runDecryptTest
  };


  /**
   * Asynchronously enqueues the next test, or stops if all tests
   * have finished.
   */
  var nextTest = function() {
    if (testTimer != null) {
      clearTimeout(testTimer);
    }
    if (testIndex < tests.length) {
      setTimeout(function() {
        var test = tests[testIndex++];
        console.log('Testing ' + test.baseName);
        var runner = RUNNERS[test.type];
        assert(runner != null, 'Unexpected test type ' + test.type);
        testTimer = setTimeout(function() {
          assert.fail(null, null, 'Test took too long.');
        }, 120 * 1000);
        runner(test, nextTest);
      }, 0);
    }
  };

  // Main code starts here.

  // 1. Evaluate the library in the global context (by using eval indirectly.)
  var global_eval = eval;
  global_eval(fs.readFileSync(e2e_library, 'utf-8'));
  assert(global.e2e != null, 'Failed to eval library.');

  // 2. Collect test cases.
  if (fs.statSync(testRoot).isFile()) {
    collectTest(testRoot);
  } else {
    fileFinder(testRoot, collectTest);
  }
  assert(tests.length > 0, 'No test cases found.');

  // 3. Start running the tests.
  nextTest();
})();
