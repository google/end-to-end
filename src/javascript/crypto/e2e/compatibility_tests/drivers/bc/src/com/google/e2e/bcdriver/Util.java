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

import org.bouncycastle.bcpg.SignatureSubpacketTags;
import org.bouncycastle.bcpg.sig.KeyFlags;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPPublicKeyRing;
import org.bouncycastle.openpgp.PGPSecretKeyRing;
import org.bouncycastle.openpgp.PGPSignature;
import org.bouncycastle.openpgp.PGPSignatureSubpacketVector;
import org.bouncycastle.openpgp.PGPUtil;
import org.bouncycastle.openpgp.operator.bc.BcKeyFingerprintCalculator;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;

final class Util {

  @SuppressWarnings({"unchecked", "rawtypes"})
  static final <T> Iterator<T> getTypedIterator(Iterator it,
      Class<T> clz) {
    return (Iterator<T>) it;
  }

  static final boolean hasKeyFlag(PGPSignature sig, int flag) {
    PGPSignatureSubpacketVector hashed = sig.getHashedSubPackets();
    if (hashed == null) {
      return false;
    }

    KeyFlags flags = (KeyFlags)
        hashed.getSubpacket(SignatureSubpacketTags.KEY_FLAGS);
    if (flags == null) {
      return false;
    }
    return ((flags.getFlags() & flag) != 0);
  }

  static final PGPPublicKeyRing readPublicKeyRing(File path)
      throws IOException, PGPException {
    InputStream in = null;
    try {
      in = PGPUtil.getDecoderStream(new BufferedInputStream(
          new FileInputStream(path)));
      return new PGPPublicKeyRing(in, new BcKeyFingerprintCalculator());
    } finally {
      if (in != null) {
        try {
          in.close();
        } catch (IOException ignore) {
          ; // do nothing
        }
      }
    }
  }

 static final PGPSecretKeyRing readSecretKeyRing(File path)
      throws IOException, PGPException {
    InputStream in = null;
    try {
      in = PGPUtil.getDecoderStream(new BufferedInputStream(
          new FileInputStream(path)));
      return new PGPSecretKeyRing(in, new BcKeyFingerprintCalculator());
    } finally {
      if (in != null) {
        try {
          in.close();
        } catch (IOException ignore) {
          ; // do nothing
        }
      }
    }
  }
}
