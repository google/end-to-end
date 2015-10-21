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

import org.bouncycastle.bcpg.sig.KeyFlags;
import org.bouncycastle.openpgp.PGPCompressedData;
import org.bouncycastle.openpgp.PGPEncryptedDataList;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPLiteralData;
import org.bouncycastle.openpgp.PGPObjectFactory;
import org.bouncycastle.openpgp.PGPOnePassSignature;
import org.bouncycastle.openpgp.PGPOnePassSignatureList;
import org.bouncycastle.openpgp.PGPPrivateKey;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPPublicKeyEncryptedData;
import org.bouncycastle.openpgp.PGPSecretKey;
import org.bouncycastle.openpgp.PGPSecretKeyRing;
import org.bouncycastle.openpgp.PGPSignature;
import org.bouncycastle.openpgp.PGPSignatureList;
import org.bouncycastle.openpgp.PGPUtil;
import org.bouncycastle.openpgp.operator.bc.BcKeyFingerprintCalculator;
import org.bouncycastle.openpgp.operator.bc.BcPBESecretKeyDecryptorBuilder;
import org.bouncycastle.openpgp.operator.bc.BcPGPContentVerifierBuilderProvider;
import org.bouncycastle.openpgp.operator.bc.BcPGPDigestCalculatorProvider;
import org.bouncycastle.openpgp.operator.bc.BcPublicKeyDataDecryptorFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.SignatureException;
import java.util.Iterator;
import java.util.List;

/**
 * Support class to decrypt an encrypted message using a parsed
 * secret key.
 */
public class Decryptor {

  static final class Result {
    private final byte[] mPlainText;
    private final String mFileName;
    private Result(byte[] plainText, String fileName) {
      mPlainText = plainText;
      mFileName = fileName;
    }
    final String getName() {
      return mFileName;
    }
    final byte[] getPlainText() {
      return mPlainText;
    }
  }

  static final PGPPrivateKey extractDecryptionKey(PGPSecretKeyRing pskr,
      String pass) throws PGPException {
    Iterator<PGPSecretKey> skit = Util.getTypedIterator(pskr.getSecretKeys(),
        PGPSecretKey.class);

    PGPSecretKey selected = null;

    // Pass #1 - use key flags on signatures.
    while (skit.hasNext()) {
      PGPSecretKey sk = skit.next();
      Iterator<PGPSignature> sigit =
          Util.getTypedIterator(sk.getPublicKey().getSignatures(),
              PGPSignature.class);
      while (sigit.hasNext()) {
        if (Util.hasKeyFlag(sigit.next(),
            KeyFlags.ENCRYPT_COMMS | KeyFlags.ENCRYPT_STORAGE)) {
          selected = sk;
          break;
        }
      }
    }
    if (selected == null) {
      // Pass #2 - use intrinsic key capabilities, but prefer subkeys
      // where possible.
      skit = Util.getTypedIterator(pskr.getSecretKeys(), PGPSecretKey.class);
      while (skit.hasNext()) {
        PGPSecretKey sk = skit.next();
        if (sk.getPublicKey().isEncryptionKey()) {
          selected = sk;
          // But continue the loop, so subkeys will be chosen.
        }
      }
    }

    if (selected != null) {
      return selected.extractPrivateKey(new BcPBESecretKeyDecryptorBuilder
          (new BcPGPDigestCalculatorProvider()).build(pass.toCharArray()));
    } else {
      return null;
    }
  }

  static final Result decrypt(InputStream in, PGPPrivateKey decryptKey,
      KeyChecker.PKR verify)
      throws IOException, PGPException, SignatureException {
    PGPObjectFactory pgpf =
        new PGPObjectFactory(PGPUtil.getDecoderStream(in),
            new BcKeyFingerprintCalculator());
    Object o = pgpf.nextObject();
    if (o == null) {
      throw new IOException("No encrypted content");
    }
    PGPEncryptedDataList enclist;
    if (o instanceof PGPEncryptedDataList) {
      enclist = (PGPEncryptedDataList) o;
    } else {
      enclist = (PGPEncryptedDataList) (pgpf.nextObject());
    }
    Iterator<PGPPublicKeyEncryptedData> pkedi =
        Util.getTypedIterator(enclist.getEncryptedDataObjects(),
            PGPPublicKeyEncryptedData.class);

    if (pkedi == null) {
      throw new IOException("no encrypted data found!");
    }
    while (pkedi.hasNext()) {
      PGPPublicKeyEncryptedData pked = pkedi.next();
      if (pked.getKeyID() == decryptKey.getKeyID()) {
        return decryptSignedContent(pked, decryptKey, verify);
      }
    }
    return null;
  }

  private static final Result decryptSignedContent(
      PGPPublicKeyEncryptedData pked, PGPPrivateKey decryptKey,
      KeyChecker.PKR verify)
      throws IOException, PGPException, SignatureException {

    InputStream clear = pked.getDataStream
        (new BcPublicKeyDataDecryptorFactory(decryptKey));

    Result ret = verifySignedContent(clear, verify);
    // Also check the message integrity
    if (pked.isIntegrityProtected() && !pked.verify()) {
      throw new IOException("Integrity check failed");
    }
    return ret;
  }

  private static final Result verifySignedContent(InputStream inp,
      KeyChecker.PKR verify)
      throws IOException, PGPException, SignatureException {
    PGPObjectFactory plainFact =
        new PGPObjectFactory(inp, new BcKeyFingerprintCalculator());

    Object msg = plainFact.nextObject();

    // swap in uncompressed data if necessary
    if (msg instanceof PGPCompressedData) {
      PGPCompressedData cData = (PGPCompressedData) msg;
      plainFact = new PGPObjectFactory(cData.getDataStream(),
          new BcKeyFingerprintCalculator());
      msg = plainFact.nextObject();
    }

    PGPOnePassSignatureList onePassSigList;
    PGPLiteralData lData;
    if (msg instanceof PGPOnePassSignatureList) {
      onePassSigList = (PGPOnePassSignatureList) msg;
      lData = (PGPLiteralData) plainFact.nextObject();
    } else {
      onePassSigList = null;
      lData = (PGPLiteralData) msg;
    }

    if ((verify != null) && (onePassSigList == null)) {
      throw new IOException("Message is unsigned");
    }

    PGPOnePassSignature onePassSig = null;
    int onePassStartIndex = -1;
    PGPPublicKey verifyKey = null;
    if (verify != null) {
      for (int i = 0; i < onePassSigList.size(); i++) {
        List<PGPPublicKey> candidates =
            verify.getSigningKeysByKeyID(onePassSigList.get(i).getKeyID());
        if (candidates.size() == 1) {
          onePassSig = onePassSigList.get(i);
          onePassStartIndex = i;
          verifyKey = candidates.get(0);
          break;
        }
      }
    }

    if ((verify != null) && (onePassSig == null)) {
      throw new IOException("Failed to find a signature from verifying key");
    }

    if (onePassSig != null) {
      onePassSig.init(new BcPGPContentVerifierBuilderProvider(), verifyKey);
    }
    ByteArrayOutputStream baout = new ByteArrayOutputStream();
    InputStream lin = lData.getInputStream();
    byte buf[] = new byte[8192];
    int nread;
    while ((nread = lin.read(buf)) > 0) {
      baout.write(buf, 0, nread);
      if (onePassSig != null) {
        onePassSig.update(buf, 0, nread);
      }
    }
    baout.close();
    if (onePassSig != null) {
      PGPSignatureList sigList = (PGPSignatureList) plainFact.nextObject();
      // One pass signature trailers occur in LIFO order compared to their
      // location in the header.
      PGPSignature sig = sigList.get(sigList.size() - 1 - onePassStartIndex);
      if (!onePassSig.verify(sig)) {
        throw new IOException("Invalid signature in message");
      }
    }
    return new Result(baout.toByteArray(), lData.getFileName());
  }
}
