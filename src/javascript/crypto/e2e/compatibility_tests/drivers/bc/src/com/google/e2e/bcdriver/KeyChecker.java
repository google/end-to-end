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

import org.bouncycastle.bcpg.PacketTags;
import org.bouncycastle.bcpg.PublicKeyAlgorithmTags;
import org.bouncycastle.bcpg.SignatureSubpacket;
import org.bouncycastle.bcpg.SignatureSubpacketTags;
import org.bouncycastle.bcpg.sig.KeyExpirationTime;
import org.bouncycastle.bcpg.sig.KeyFlags;
import org.bouncycastle.bcpg.sig.SignatureCreationTime;
import org.bouncycastle.bcpg.sig.SignatureExpirationTime;
import org.bouncycastle.openpgp.PGPException;
import org.bouncycastle.openpgp.PGPObjectFactory;
import org.bouncycastle.openpgp.PGPPublicKey;
import org.bouncycastle.openpgp.PGPPublicKeyRing;
import org.bouncycastle.openpgp.PGPSignature;
import org.bouncycastle.openpgp.PGPSignatureList;
import org.bouncycastle.openpgp.PGPSignatureSubpacketVector;
import org.bouncycastle.openpgp.operator.bc.BcKeyFingerprintCalculator;
import org.bouncycastle.openpgp.operator.bc.BcPGPContentVerifierBuilderProvider;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SignatureException;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;

/**
 * A support class that runs signature checks on a parsed key.
 */
public class KeyChecker {
  /**
   * Encapsulates filtered information about a verified userid
   * within the PKR class.
   */
  public static final class UserID {
    public String getName() {
      return mUid;
    }
    public PGPSignature getSignature() {
      return mSig;
    }
    private UserID(String uid, PGPSignature sig) {
      mUid = uid;
      mSig = sig;
    }
    private final String mUid;
    private final PGPSignature mSig;
  }

  /**
   * Provides access to a verified subkey within the PKR.
   */
  public static final class Subkey {

    public PGPSignature getSignature() {
      return mSig;
    }
    public PGPPublicKey getPublicKey() {
      return mSubkey;
    }

    private Subkey(PGPPublicKey subkey, PGPSignature sig) {
      mSubkey = subkey;
      mSig = sig;
    }
    private final PGPPublicKey mSubkey;
    private final PGPSignature mSig;
  }

  /**
   * <p>This class provides filtered access to verified
   * userids, user attributes and subkeys from a raw
   * PGPPublicKeyRing.</p>
   *
   * <p>Initialized using the
   * {@link KeyChecker#validate(PGPPublicKeyRing) validate}
   * method</p>
   */
  public static final class PKR {

    /**
     * Represents the possible states of a key after all signatures
     * have been checked.
     */
    public enum Status { OK, REVOKED, UNUSABLE };

    public PGPPublicKeyRing getOriginal() {
      return mPkr;
    }
    /**
     * <p>Just a log of any errors encountered while examining
     * the keyring. Since many errors are skipped, you can
     * have a PKR with status <tt>OK</tt> as well as errors
     * here.</p>
     */
    public String getErrors() {
      return mErrors.toString();
    }
    public Status getStatus() {
      return mStatus;
    }
    /**
     * @return a list of verified userids within the keyring.
     */
    public List<UserID> getUserIDs() {
      return mUids;
    }
    /**
     * @return a list of verified subkeys within the keyring.
     */
    public List<Subkey> getSubkeys() {
      return mSubkeys;
    }
    /**
     * @param keyid is the id to use when searching.
     *
     * @return a list of PGPPublicKeys that match the provided
     * keyid, and are usable for checking signatures. The list is
     * almost certain to have atmost one entry, but technically
     * it's possible to have multiple keys with the same keyid.
     */
    public List<PGPPublicKey> getSigningKeysByKeyID(long keyid) {

      List<PGPPublicKey> ret = new ArrayList<PGPPublicKey>();

      // First check if we're the primary key.
      PGPPublicKey masterpk = mPkr.getPublicKey();
      if (masterpk.getKeyID() == keyid) {
        // Check if the main key is usable by checking for an
        // appropriate use flag in its verified self-signatures.
        for (UserID uid : getUserIDs()) {
          if (Util.hasKeyFlag(uid.getSignature(), KeyFlags.SIGN_DATA)) {
            ret.add(masterpk);
            break;
          }
        }
      }
      // Check verified subkeys as well.
      for (Subkey subkey : getSubkeys()) {
        PGPPublicKey candidate = subkey.getPublicKey();
        if (candidate.getKeyID() == keyid) {
          if (Util.hasKeyFlag(subkey.getSignature(), KeyFlags.SIGN_DATA)) {
            ret.add(candidate);
            break;
          }
        }
      }
      // If we found nothing, try again; but this time just consider
      // key capabilities.
      if (ret.size() == 0) {
        for (Subkey subkey : getSubkeys()) {
          PGPPublicKey candidate = subkey.getPublicKey();
          if ((candidate.getKeyID() == keyid)
              && canSign(candidate.getAlgorithm())) {
            ret.add(candidate);
            break;
          }
        }
      }
      if (ret.size() == 0) {
        if ((masterpk.getKeyID() == keyid)
            && canSign(masterpk.getAlgorithm())) {
          ret.add(masterpk);
        }
      }
      return ret;
    }

    private PKR(Status status, PGPPublicKeyRing pkr,
        List<UserID> uids, List<Subkey> subkeys, StringBuilder errors) {
      mStatus = status;
      mPkr = pkr;
      mUids = uids;
      mSubkeys = subkeys;
      mErrors = errors;
    }
    private final Status mStatus;
    private final PGPPublicKeyRing mPkr;
    private final List<UserID> mUids;
    private final List<Subkey> mSubkeys;
    private final StringBuilder mErrors;
  }

  /**
   * <p>This is the primary way to use this utility. It examines a
   * provided PGPPublicKeyRing and returns a wrapped object that
   * provides access only to verified key material.</p>
   *
   * @param pkr is the keyring to be examined.
   * @return an object that provides filtered access to verified key material.
   */
  public static final PKR validate(PGPPublicKeyRing pkr)
      throws PGPException, SignatureException, IOException {

    // First handle keyring revocation/designated revokers
    PGPPublicKey masterpk = pkr.getPublicKey();
    if (!masterpk.isMasterKey()) {
      throw new IllegalArgumentException
          ("Unexpected - first key is not master");
    }

    StringBuilder errors = new StringBuilder();

    List<UserID> userids = new ArrayList<UserID>();
    List<Subkey> subkeys = new ArrayList<Subkey>();

    int validRejects = 0;
    if (masterpk.hasRevocation()) {
      // Second pass - check for revocations.
      Iterator<PGPSignature> masterSigit = Util.getTypedIterator(
          masterpk.getSignaturesOfType(PGPSignature.KEY_REVOCATION),
          PGPSignature.class);
      while (masterSigit.hasNext()) {
        PGPSignature sig = masterSigit.next();
        if (isGoodDirectSignature(sig, masterpk, masterpk, errors)) {
          validRejects++;
        }
      }
    }
    if (validRejects > 0) {
      // Primary key is revoked, discard everything else.
      return new PKR(PKR.Status.REVOKED, pkr, userids, subkeys, errors);
    }

    // Filter for valid userids.
    Iterator<String> uidit = Util.getTypedIterator(masterpk.getUserIDs(),
        String.class);
    while (uidit.hasNext()) {
      maybeAddUserID(userids, masterpk, uidit.next(), errors);
    }

    // Don't bother with subkeys if we don't have a valid uid.
    if ((userids.size() == 0)) {
      return new PKR(PKR.Status.UNUSABLE, pkr, userids, subkeys, errors);
    }

    // Now start checking subkeys.
    Iterator<PGPPublicKey> keysit = pkr.getPublicKeys();
    // Skip the first (master) key.
    keysit.next();

    while (keysit.hasNext()) {
      PGPPublicKey subkey = keysit.next();
      if (subkey.isMasterKey()) {
        throw new IllegalArgumentException("unexpected");
      }
      maybeAddSubkey(subkeys, masterpk, subkey, errors);
    }

    return new PKR(PKR.Status.OK, pkr, userids, subkeys, errors);
  }

  private static final boolean canSign(int algorithm) {
    return (algorithm == PublicKeyAlgorithmTags.RSA_GENERAL)
        || (algorithm == PublicKeyAlgorithmTags.RSA_SIGN)
        || (algorithm == PublicKeyAlgorithmTags.DSA)
        || (algorithm == PublicKeyAlgorithmTags.ECDSA);
  }

  private static final void maybeAddUserID(List<UserID> uids, PGPPublicKey pk,
      String uid, StringBuilder errors)
      throws PGPException, SignatureException, IOException {

    Iterator <PGPSignature> sigit =
        Util.getTypedIterator(pk.getSignaturesForID(uid), PGPSignature.class);
    if (sigit == null) {
      errors.append("Reject name '" + uid + "' for " + nicePk(pk)
          + " because no self-signatures were found.\n");
      return;
    }

    // Select the most recent valid signature.
    PGPSignature validSig = null;
    long validTs = -1L;

    while (sigit.hasNext()) {
      PGPSignature sig = sigit.next();

      switch (sig.getSignatureType()) {
        case PGPSignature.DEFAULT_CERTIFICATION:
        case PGPSignature.NO_CERTIFICATION:
        case PGPSignature.CASUAL_CERTIFICATION:
        case PGPSignature.POSITIVE_CERTIFICATION:
        case PGPSignature.CERTIFICATION_REVOCATION:
          if (isGoodUIDSignature(sig, pk, uid, errors)) {
            long ts = sig.getCreationTime().getTime();
            if (ts > validTs) {
              validTs = ts;
              validSig = sig;
            }
          }
          break;

        default:
          break;
      }
    }

    if (validSig == null) {
      errors.append("Name '" + uid
          + "' rejected because no self-signatures were found.\n");
      return;
    }

    if (validSig.getSignatureType() == PGPSignature.CERTIFICATION_REVOCATION) {
      errors.append("Name '" + uid + "' rejected because it was revoked.\n");
      return;
    }

    // Add UID information.
    uids.add(new UserID(uid, validSig));
  }

  private static final void maybeAddSubkey(List<Subkey> subkeys,
      PGPPublicKey masterpk, PGPPublicKey subkey, StringBuilder errors)
      throws PGPException, SignatureException, IOException {

    Iterator <PGPSignature> sigit =
        Util.getTypedIterator(subkey.getSignatures(), PGPSignature.class);
    if (sigit == null) {
      errors.append("Reject subkey " + nicePk(subkey)
          + " because no binding signatures were found.\n");
      return;
    }

    PGPSignature validSig = null;
    long validTs = -1L;

    while (sigit.hasNext()) {
      PGPSignature sig = sigit.next();
      switch (sig.getSignatureType()) {
        case PGPSignature.SUBKEY_BINDING:
        case PGPSignature.SUBKEY_REVOCATION:
          if (isGoodSubkeySignature(sig, masterpk, subkey, errors)) {
            if (sig.getSignatureType() == PGPSignature.SUBKEY_REVOCATION) {
              // Reject this subkey permanently.
              errors.append("Subkey " + nicePk(subkey) + " revoked by "
                  + niceSig(sig) + "\n");
              return;
            }
            // signing subkeys must have an embedded back signature.
            if (!Util.hasKeyFlag(sig, KeyFlags.SIGN_DATA)
                || isGoodBackSignature(sig, masterpk, subkey, errors)) {
              long ts = getSignatureTimestamp(sig, errors);
              if (ts > validTs) {
                validSig = sig;
                validTs = ts;
              }
            }
          }
          break;

        default:
          errors.append("Ignore " + niceSig(sig) + " for subkey "
              + nicePk(subkey) + "\n");
          break;
      }
    }
    // We need atleast one good binding.
    if (validSig == null) {
      errors.append
          ("Subkey " + nicePk(subkey)
              + " rejected because no valid binding signatures were found.\n");
      return;
    }
    subkeys.add(new Subkey(subkey, validSig));
  }

  private static final String nicePk(PGPPublicKey pk) {
    return "0x" + Long.toHexString(pk.getKeyID());
  }

  private static final String niceSig(PGPSignature sig) {
    return "signature (type=0x" + Integer.toHexString(sig.getSignatureType())
        + ") issued by keyid 0x" + Long.toHexString(sig.getKeyID());
  }

  private static final boolean isGoodSubkeySignature(PGPSignature sig,
      PGPPublicKey primary, PGPPublicKey subkey, StringBuilder errors)
      throws PGPException, SignatureException, IOException {

    sig.init(new BcPGPContentVerifierBuilderProvider(), primary);

    return sig.verifyCertification(primary, subkey)
        && isSignatureCurrent(sig, errors);
  }

  private static final boolean isGoodDirectSignature(PGPSignature sig,
      PGPPublicKey signer, PGPPublicKey target, StringBuilder errors)
      throws PGPException, SignatureException, IOException {

    sig.init(new BcPGPContentVerifierBuilderProvider(), signer);

    boolean ok;

    // There's a bug that prevents sig.verifyCertification(signer)
    // working for DIRECT_KEY signatures.
    //
    // So, re-implement the code again here.
    if (sig.getSignatureType() == PGPSignature.DIRECT_KEY) {
      byte[] bytes = target.getPublicKeyPacket().getEncodedContents();
      sig.update((byte) 0x99);
      sig.update((byte) (bytes.length >> 8));
      sig.update((byte) (bytes.length));
      sig.update(bytes);
      ok = sig.verify();
    } else {
      ok = sig.verifyCertification(target);
    }

    // If we have a good signature, also ensure the signature
    // hasn't expired.
    return ok && isSignatureCurrent(sig, errors);
  }

  private static final boolean isGoodBackSignature(PGPSignature sig,
      PGPPublicKey signer, PGPPublicKey target, StringBuilder errors)
      throws PGPException, SignatureException, IOException {

    SignatureSubpacket esigpack = null;

    // Prefer to get it from the hashed subpacket.
    PGPSignatureSubpacketVector svec = sig.getHashedSubPackets();
    if (svec != null) {
      esigpack =
          svec.getSubpacket(SignatureSubpacketTags.EMBEDDED_SIGNATURE);
    }

    if (esigpack == null) {
      svec = sig.getUnhashedSubPackets();
      if (svec != null) {
        esigpack =
            svec.getSubpacket
            (SignatureSubpacketTags.EMBEDDED_SIGNATURE);
      }
    }

    if (esigpack == null) {
      errors.append("Rejecting " + niceSig(sig)
          + " for subkey " + nicePk(target)
          + " because it doesn't have a cross-certification.\n"
          + "See https://www.gnupg.org/faq/subkey-cross-certify.html\n");
      return false;
    }

    // Unfortunately, since PGPSignature(byte[]) is not public, we
    // have to go through this ugly contortion to get a signature.

    ByteArrayOutputStream baout = new ByteArrayOutputStream();
    // dump out an old-style header.
    int hdr = 0x80 | (PacketTags.SIGNATURE << 2);
    int len = esigpack.getData().length;
    if (len <= 0xff) {
      baout.write(hdr);
      baout.write(len);
    } else if (len <= 0xffff) {
      baout.write(hdr | 0x01);
      baout.write((len >> 8) & 0xff);
      baout.write(len & 0xff);
    } else {
      baout.write(hdr | 0x02);
      baout.write((len >> 24) & 0xff);
      baout.write((len >> 16) & 0xff);
      baout.write((len >> 8) & 0xff);
      baout.write(len & 0xff);
    }

    baout.write(esigpack.getData());
    baout.close();

    PGPObjectFactory fact = new PGPObjectFactory(new ByteArrayInputStream(
        baout.toByteArray()), new BcKeyFingerprintCalculator());

    Object obj = fact.nextObject();

    if (!(obj instanceof PGPSignatureList)) {
      errors.append("Rejecting " + niceSig(sig)
          + " for subkey " + nicePk(target)
          + " because no usable embedded signature is available.\n");
      return false;
    }
    PGPSignatureList esiglist = (PGPSignatureList) obj;
    if (esiglist.size() != 1) {
      errors.append("Rejecting " + niceSig(sig)
          + " for subkey " + nicePk(target)
          + " because no usable embedded signature is available.\n");
      return false;
    }

    PGPSignature esig = esiglist.get(0);
    if (esig.getSignatureType() != PGPSignature.PRIMARYKEY_BINDING) {
      errors.append("Rejecting " + niceSig(sig)
          + " for subkey " + nicePk(target)
          + " because the embedded " + niceSig(esig)
          + " is not a proper backsignature.\n");
      return false;
    }

    esig.init(new BcPGPContentVerifierBuilderProvider(), target);

    return esig.verifyCertification(signer, target)
        && isSignatureCurrent(esig, errors);
  }

  private static final boolean isGoodUIDSignature(PGPSignature sig,
      PGPPublicKey masterpk, String uid, StringBuilder errors)
      throws PGPException, SignatureException, IOException {

    sig.init(new BcPGPContentVerifierBuilderProvider(), masterpk);
    if (!sig.verifyCertification(uid, masterpk)) {
      errors.append("Skipping certification " + niceSig(sig)
          + " for '" + uid + "' because the signature is invalid.\n");
      return false;
    }
    return isSignatureCurrent(sig, errors);
  }

  // Return a negative value if the signature doesn't have a
  // valid timestamp.
  private static final long getSignatureTimestamp(PGPSignature sig,
      StringBuilder errors) {
    long ts = sig.getCreationTime().getTime();
    // Work-around bouncycastle not indicating lack of timestamp as a
    // hashed subpacket.
    if (sig.getVersion() == 4) {
      // Make sure we actually have a timestamp packet in
      // the hashed section.
      PGPSignatureSubpacketVector svec = sig.getHashedSubPackets();
      if (svec == null) {
        errors.append(niceSig(sig) + " is missing a creation timestamp.\n");
        return -1L;
      }
      SignatureCreationTime tspack = (SignatureCreationTime)
          svec.getSubpacket(SignatureSubpacketTags.CREATION_TIME);
      if (tspack == null) {
        errors.append(niceSig(sig) + " is missing a creation timestamp.\n");
        return -1L;
      }
      ts = tspack.getTime().getTime();
    }
    return ts;
  }

  private static final boolean isSignatureCurrent(PGPSignature sig,
      StringBuilder errors) {

    long ts = getSignatureTimestamp(sig, errors);
    if (ts < 0) {
      return false;
    }
    // Timestamp should not be in the future.
    if (ts > (System.currentTimeMillis() + ACCEPTABLE_DELTA_MSEC)) {
      errors.append(niceSig(sig) + " in the future? (" + new Date(ts) + ")\n");
      return false;
    }
    if (ts < 0) {
      errors.append(niceSig(sig) + " is negative? (" + ts + ")\n");
      return false;
    }

    // Check if the signature or key has expired.
    PGPSignatureSubpacketVector svec = sig.getHashedSubPackets();
    if (svec != null) {
      SignatureExpirationTime tspack = (SignatureExpirationTime)
          svec.getSubpacket(SignatureSubpacketTags.EXPIRE_TIME);
      if (tspack != null) {
        long expDelta = tspack.getTime() * 1000L;
        if (!acceptableInterval(sig, ts, expDelta, errors)) {
          return false;
        }
      }
      // If there's a key-expiration subpacket, also check that.
      KeyExpirationTime ket =  (KeyExpirationTime)
          svec.getSubpacket(SignatureSubpacketTags.KEY_EXPIRE_TIME);
      if (ket != null) {
        long expDelta = ket.getTime() * 1000L;
        if (!acceptableInterval(sig, ts, expDelta, errors)) {
          return false;
        }
      }
    }

    return true;
  }

  private static final boolean acceptableInterval(PGPSignature sig,
      long start, long delta, StringBuilder errors) {
    if (delta < 0) {
      errors.append(niceSig(sig) + " has a negative expiration interval ("
          + delta + ")\n");
      return false;
    }
    if ((start + delta)
        < (System.currentTimeMillis() - ACCEPTABLE_DELTA_MSEC)) {
      errors.append(niceSig(sig) + " has expired\n");
      return false;
    }
    return true;
  }

  // willing to accept timestamps within this interval. (1 minute)
  private static final long ACCEPTABLE_DELTA_MSEC = 60L * 1000L;
}
