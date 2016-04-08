/*
 * Copyright 2015 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package com.google.e2e.bcdriver;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPPrivateKey;
import org.bouncycastle.openpgp.PGPSecretKeyRing;
import org.bouncycastle.util.encoders.Hex;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.security.SignatureException;
import java.util.HashSet;
import java.util.Set;

/**
 * A simple driver to run the OpenPGP compatibility tests against
 * the Bouncy Castle library.
 */
public class Main {
  public static void main(String args[])
      throws IOException, PGPException {
    int failureCount = runTests(new File(args[0]), 0);
    if (failureCount > 0) {
      System.out.println(failureCount + " failures");
      System.exit(1);
    } else {
      System.exit(0);
    }
  }

  private static final int runTests(File root, int failureCount) {

    File children[] = root.listFiles();
    if (children == null) {
      return failureCount;
    }
    for (File child : children) {
      if (child.getName().startsWith(".")) {
        continue;
      }
      if (child.isDirectory()) {
        failureCount = runTests(child, failureCount);
      } else if (child.getName().endsWith(".json")) {
        try {
          print(child.getName() + ": ");
          runTest(child);
        } catch (Throwable any) {
          failureCount++;
          println("FAILED");
          any.printStackTrace();
          println("");
        }
      }
    }
    return failureCount;
  }

  private static final void runTest(File base)
      throws IOException, PGPException, SignatureException {
    BufferedReader br = new BufferedReader(new FileReader(base));
    JsonParser parser = new JsonParser();
    try {
      JsonObject config = parser.parse(br).getAsJsonObject();
      String testType = config.get("type").getAsString();
      if (testType.equals("import")) {
        print("IMPORT: ");
        runImportTest(config, base);
      } else if (testType.equals("decrypt")) {
        print("DECRYPT: ");
        runDecryptTest(config, base);
      } else {
        throw new IllegalArgumentException(
            "Unexpected test type in " + base);
      }
    } finally {
      br.close();
    }
  }

  private static final String getBaseName(File base) {
    String name = base.getName();
    return name.substring(0, name.length() - ".json".length());
  }

  private static final void runImportTest(JsonObject config, File base)
      throws IOException, PGPException, SignatureException {
    File root = base.getParentFile();
    String baseName = getBaseName(base);
    KeyChecker.PKR info = KeyChecker.validate(Util.readPublicKeyRing(
        new File(root, baseName + ".asc")));
    assertEquals(info.getErrors(), KeyChecker.PKR.Status.OK, info.getStatus());
    assertEquals("mismatched fingerprint",
        config.get("expected_fingerprint").getAsString(),
        hexEncode(info.getOriginal().getPublicKey().getFingerprint()));
    JsonArray uids = config.get("expected_uids").getAsJsonArray();
    assertEquals("Uids not correctly found", uids.size(),
        info.getUserIDs().size());
    Set<String> actualUids = new HashSet<String>();
    for (KeyChecker.UserID uid : info.getUserIDs()) {
      actualUids.add(uid.getName());
    }
    for (JsonElement uid : uids) {
      assertEquals("missing uid", actualUids.contains(uid.getAsString()), true);
    }
    if (config.has("expected_subkeys")) {
      JsonArray subkeys = config.get("expected_subkeys").getAsJsonArray();
      assertEquals("Subkeys not found", subkeys.size(),
          info.getSubkeys().size());
      Set<String> fingerprints = new HashSet<String>();
      for (KeyChecker.Subkey subkey : info.getSubkeys()) {
        fingerprints.add(hexEncode(subkey.getPublicKey().getFingerprint()));
      }
      for (JsonElement subkey : subkeys) {
        JsonObject data = subkey.getAsJsonObject();
        if (data.has("expected_fingerprint")) {
          assertEquals("missing fingerprint",
              fingerprints.contains(
                  data.get("expected_fingerprint").getAsString()), true);
        }
      }
    }
    println("OK");
  }

  private static final String hexEncode(byte[] data)
      throws UnsupportedEncodingException {
    return new String(Hex.encode(data), "utf-8");
  }

  private static final void assertNotNull(String message, Object a) {
    if (a == null) {
      throw new AssertionError(message + " (object is null)");
    }
  }

  private static final void assertEquals(String message, Object a, Object b) {
    if ((a == null) && (b == null)) {
      return;
    }

    if (((a == null) && (b != null))
        || ((a != null) && (b == null))) {
      throw new AssertionError(message + " (" + a + " != " + b + ")");
    }

    if (!a.equals(b)) {
      throw new AssertionError(message + " (" + a + " != " + b + ")");
    }
  }

  private static final void runDecryptTest(JsonObject config, File base)
      throws PGPException, SignatureException, IOException {
    File root = base.getParentFile();
    String baseName = getBaseName(base);

    KeyChecker.PKR verify;
    if (config.has("verifyKey")) {
      verify = KeyChecker.validate(Util.readPublicKeyRing(
          new File(root, config.get("verifyKey").getAsString())));
      assertEquals(verify.getErrors(),
          KeyChecker.PKR.Status.OK, verify.getStatus());
    } else {
      verify = null;
    }

    PGPSecretKeyRing skr =
        Util.readSecretKeyRing(new File(root,
                config.get("decryptKey").getAsString()));
    assertNotNull("Could not read key", skr);

    PGPPrivateKey decryptKey = Decryptor.extractDecryptionKey(skr,
        config.get("passphrase").getAsString());
    assertNotNull("Could not decrypt secret key", decryptKey);

    BufferedInputStream bin = null;
    try {
      bin = new BufferedInputStream(new FileInputStream(
          new File(root, baseName + ".asc")));
      Decryptor.Result result = Decryptor.decrypt(bin, decryptKey, verify);
      if (config.has("filename")) {
        assertEquals("Mismatched filename",
            config.get("filename").getAsString(), result.getName());
      }
      if (config.has("textcontent")) {
        assertEquals("Incorrect content",
            config.get("textcontent").getAsString(),
            new String(result.getPlainText(), "utf-8"));
      }
      println("OK");
    } finally {
      if (bin != null) {
        try {
          bin.close();
        } catch (IOException ignore) {
          ; // ignore
        }
      }
    }
  }

  private static final void print(String s) {
    System.err.print(s);
    System.err.flush();
  }
  private static final void println(String s) {
    System.err.println(s);
  }

}
