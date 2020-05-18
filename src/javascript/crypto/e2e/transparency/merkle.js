/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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

/**
 * @fileoverview Functions to verify a map inclusion proof for a leaf node in
 *     a Merkle tree.
 */

goog.module('e2e.transparency.merkle');

const InvalidArgumentsError = goog.require('e2e.error.InvalidArgumentsError');
const Sha512_256 = goog.require('goog.crypt.Sha512_256');
const e2e = goog.require('e2e');
const {findIndex} = goog.require('goog.array');

/**
 * Fixed depth of the Merkle trees used to store maps in Key Transparency.
 *
 * A leaf node's index is determined by its VRF value, which is the SHA-256 hash
 * of some computation.  So there are 2^256 possible leaf nodes and 257 levels
 * of the tree (including the root node).  Even though there are 257 levels of
 * nodes, this value is 256 because it's used to check preconditions of various
 * arguments in TreeChecker.isProofValid.
 *
 * @private
 */
const TREE_SIZE_ = 256;

/**
 * Fixed size of a ByteArray holding an index within this fixed-size tree.
 *
 * @private
 */
const INDEX_SIZE_BYTES_ = (TREE_SIZE_ / 8);

/**
 * Fixed size of the "tree ID" used as a nonce for hashing.
 *
 * @private
 */
const TREE_ID_SIZE_BYTES_ = 8;

/**
 * Size of the hash associated with every node in the tree.  CONIKS uses
 * SHA512-256, so this is 256 / 8 = 32;
 *
 * @private
 */
const NODE_HASH_SIZE_BYTES_ = 32;

/**
 * Constant prefix used when hashing leaf nodes.
 *
 * @private {!e2e.ByteArray}
 */
const LEAF_PREFIX_ = e2e.stringToByteArray('L');

/**
 * Constant prefix used when hashing empty nodes.
 *
 * @private {!e2e.ByteArray}
 */
const EMPTY_PREFIX_ = e2e.stringToByteArray('E');

/**
 * Precalculated masks for extracting a bit from a byte.  MASKS_[i] is a mask to
 * extract the i'th bit from a byte, starting from the most significant bit.
 *
 * @private
 */
const MASKS_ = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];

/**
 * Precalculated masks for masking out low-order bits from a byte.
 * LEFTMASKS_[i] is a mask that will preserve the i highest-order bits in a
 * byte.
 *
 * @private
 */
const LEFTMASKS_ = [0x00, 0x80, 0xc0, 0xe0, 0xf0, 0xf8, 0xfc, 0xfe];

/**
 * An index into the fixed-size Merkle tree that holds the user -> data map in
 * Key Transparency.
 */
const TreeIndex = goog.defineClass(null, {
  /**
   * @param {!e2e.ByteArray} indexBytes Index into the tree as a byte array.
   * @throws {!InvalidArgumentsError} If indexBytes is not exactly 32 bytes
   *     long.
   */
  constructor(indexBytes) {
    e2e.assert(
        indexBytes.length == INDEX_SIZE_BYTES_,
        'index is wrong size (' + indexBytes.length + ' bytes)',
        InvalidArgumentsError);
    /** @private @const */ this.indexBytes_ = indexBytes;
  },

  /**
   * Returns a copy of the ByteArray used to construct this index.
   *
   * @return {!e2e.ByteArray}
   */
  bytes() {
    return this.indexBytes_.slice();
  },

  /**
   * Determines whether the i'th bit of the index is set (with the MSB being
   * i = 0).
   *
   * @param {number} i
   * @return {boolean}
   * @throws {!InvalidArgumentsError} If the value of i is incorrect.
   */
  isBitSet(i) {
    e2e.assert(
        (i >= 0 && i < TREE_SIZE_), 'index ' + i + ' out of range',
        InvalidArgumentsError);
    return Boolean(this.indexBytes_[i >> 3] & MASKS_[i % 8]);
  },

  /**
   * Returns a TreeIndex representing a copy of the underlying ByteArray with
   * the rightmost `height` bits set to zero.
   *
   * @param {number} height
   * @return {!TreeIndex}
   */
  mask(height) {
    return new TreeIndex(this.mask_(height));
  },

  /**
   * Returns a byte array representing a copy of the underlying ByteArray with
   * the rightmost `height` bits set to 0.
   *
   * @param {number} height
   * @return {!e2e.ByteArray}
   */
  mask_(height) {
    e2e.assert(
        height >= 0 && height <= TREE_SIZE_, 'bad height ' + height,
        InvalidArgumentsError);
    const depth = TREE_SIZE_ - height;
    const byteDepth = depth >> 3;
    return this.indexBytes_.map(function(byte, i) {
      if (i < byteDepth) {
        return byte;
      } else if (i == byteDepth) {
        return byte & LEFTMASKS_[depth % 8];
      } else {
        return 0x00;
      }
    });
  },

  /**
   * Returns an array of all the sibling nodes encountered when climbing the
   * tree from this leaf to the root.  Nodes above the leaf nodes have their
   * irrelevant bits masked.
   *
   * @return {!Array<!TreeIndex>}
   */
  ascentSiblings() {
    const results = new Array(TREE_SIZE_);
    for (let height = 0; height <= TREE_SIZE_; height++) {
      const masked = this.mask_(height);
      const bitToFlipDepth = TREE_SIZE_ - height - 1;
      masked[bitToFlipDepth >> 3] =
          masked[bitToFlipDepth >> 3] ^ MASKS_[bitToFlipDepth % 8];
      results[height] = new TreeIndex(masked);
    }
    return results;
  }
});

/**
 * Calculates the hash for a leaf node containing this particular data.
 *
 * @param {!e2e.ByteArray} treeId Eight-byte nonce used to identify this tree.
 * @param {!TreeIndex} leafIndex Index of the leaf in the tree.
 * @param {!e2e.ByteArray} data Data associated with the leaf node.
 * @return {!e2e.ByteArray} Hash output for this leaf node.
 * @throws {!InvalidArgumentsError} If the treeId is the wrong size.
 */
const hashLeaf = function(treeId, leafIndex, data) {
  e2e.assert(
      treeId.length == TREE_ID_SIZE_BYTES_,
      'tree ID has wrong size (' + treeId.length + ' bytes)',
      InvalidArgumentsError);
  const h = new Sha512_256();
  h.update(LEAF_PREFIX_);
  h.update(treeId);
  h.update(leafIndex.bytes());
  h.update(e2e.dwordArrayToByteArray([TREE_SIZE_]));
  h.update(data);
  return h.digest();
};

/**
 * Calculates the hash for an empty "node", which represents the collapsing of
 * an entirely empty subtree up to a particular height.
 *
 * @param {!e2e.ByteArray} treeId Eight-byte nonce used to identify this tree.
 * @param {!TreeIndex} leafIndex Index of any leaf contained within the empty
 *     subtree.
 * @param {number} height Height of the top of the empty subtree.
 * @return {!e2e.ByteArray} Hash associated with this empty subtree.
 * @throws {!InvalidArgumentsError} If the height is not valid.
 */
const hashEmpty = function(treeId, leafIndex, height) {
  e2e.assert(
      treeId.length == TREE_ID_SIZE_BYTES_,
      'tree ID has wrong size (' + treeId.length + ' bytes)',
      InvalidArgumentsError);
  e2e.assert(
      height >= 0 && height <= TREE_SIZE_,
      'height ' + height + ' not in [0, 256]', InvalidArgumentsError);
  const h = new Sha512_256();
  h.update(EMPTY_PREFIX_);
  h.update(treeId);
  h.update(leafIndex.mask(height).bytes());
  const depth = TREE_SIZE_ - height;
  h.update(e2e.dwordArrayToByteArray([depth]));
  return h.digest();
};

/**
 * Calculates the hash for a node with at least one non-empty child node.
 *
 * Both arguments must not be null.  If one of the child nodes being
 * considered is "empty," then use hashEmpty to calculate its hash before
 * calling hashChildren.
 *
 * @param {!e2e.ByteArray} left Hash of the left child node.
 * @param {!e2e.ByteArray} right Hash of the right child node.
 * @return {!e2e.ByteArray}
 */
const hashChildren = function(left, right) {
  // We don't use InvalidArgumentsError because this is an assertion for
  // correctness/debugging, not a precondition on the argument.
  e2e.assert(
      left.length == NODE_HASH_SIZE_BYTES_,
      'left child has bad length (' + left.length + ' bytes)');
  e2e.assert(
      right.length == NODE_HASH_SIZE_BYTES_,
      'right child has bad length (' + right.length + ' bytes)');
  const h = new Sha512_256();
  h.update(left);
  h.update(right);
  return h.digest();
};

/**
 * Verifies whether a claimed inclusion proof actually shows that the data is in
 * the tree.
 *
 * @param {!e2e.ByteArray} treeId Eight-byte nonce identifying the tree.
 * @param {!TreeIndex} index Index of the leaf node in the Merkle tree (must
 *     be 64 bytes).
 * @param {!e2e.ByteArray} leafData Data present at the leaf node.
 * @param {!e2e.ByteArray} rootHash Hash value at the root of the tree.
 * @param {!Array<?e2e.ByteArray>} proof Inclusion proof claiming to demonstrate
 *     presence of the data in the tree.  Must contain 256 values, which must
 *     either be 256-bit hashes or null.
 * @return {boolean} Whether the inclusion proof is correct.
 * @throws {!InvalidArgumentsError} If any of the data provided is the wrong
 * size.
 */
const verifyInclusionProof = function(
    treeId, index, leafData, rootHash, proof) {
  // Verify preconditions.
  e2e.assert(
      treeId.length == TREE_ID_SIZE_BYTES_,
      'tree ID has wrong size (' + treeId.length + ' bytes)',
      InvalidArgumentsError);
  e2e.assert(
      rootHash.length == NODE_HASH_SIZE_BYTES_,
      'root hash has wrong size (' + rootHash.length + ' bytes)',
      InvalidArgumentsError);
  e2e.assert(
      proof.length == TREE_SIZE_,
      'proof has wrong size (' + proof.length + ' elements)',
      InvalidArgumentsError);
  e2e.assert(
      proof.every(function(el) {
        return (el === null) || (el.length == NODE_HASH_SIZE_BYTES_);
      }),
      'proof fails precondition -- every element must be either null or ' +
          NODE_HASH_SIZE_BYTES_ + ' bytes',
      InvalidArgumentsError);
  // Now actually do the work.
  let hash = hashLeaf(treeId, index, leafData);
  const siblings = index.ascentSiblings();
  for (let height = 0; height < TREE_SIZE_; height++) {
    const siblingIndex = siblings[height];
    const neighborHash =
        proof[height] || hashEmpty(treeId, siblingIndex, height);
    const isNeighborOnLeft = index.isBitSet(TREE_SIZE_ - height - 1);
    hash = isNeighborOnLeft ? hashChildren(neighborHash, hash) :
                              hashChildren(hash, neighborHash);
  }
  return e2e.compareByteArray(hash, rootHash);
};

/**
 * Verifies whether a claimed proof actually shows that a leaf node is empty.
 *
 * @param {!e2e.ByteArray} treeId Eight-byte nonce identifying the tree.
 * @param {!TreeIndex} index Index of the leaf node in the Merkle tree (must
 *     be 64 bytes).
 * @param {!e2e.ByteArray} rootHash Hash value at the root of the tree.
 * @param {!Array<?e2e.ByteArray>} proof Exclusion proof claiming to demonstrate
 *     the absence of data at the index.  Must contain 256 values, which must
 *     either be 256-bit hashes or null.
 * @return {boolean} Whether the exclusion proof is correct.
 * @throws {!InvalidArgumentsError} If any of the data provided is the wrong
 * size.
 */
const verifyExclusionProof = function(treeId, index, rootHash, proof) {
  // Verify preconditions.
  e2e.assert(
      treeId.length == TREE_ID_SIZE_BYTES_,
      'tree ID has wrong size (' + treeId.length + ' bytes)',
      InvalidArgumentsError);
  e2e.assert(
      rootHash.length == NODE_HASH_SIZE_BYTES_,
      'root hash has wrong size (' + rootHash.length + ' bytes)',
      InvalidArgumentsError);
  e2e.assert(
      proof.length == TREE_SIZE_,
      'proof has wrong size (' + proof.length + ' elements)',
      InvalidArgumentsError);
  e2e.assert(
      proof.every(function(el) {
        return (el === null) || (el.length == NODE_HASH_SIZE_BYTES_);
      }),
      'proof fails precondition -- every element must be either null or ' +
          NODE_HASH_SIZE_BYTES_ + ' bytes',
      InvalidArgumentsError);
  // Now actually do the work.
  const siblings = index.ascentSiblings();
  let height = findIndex(proof, function(x) {
    return Boolean(x);
  });
  if (height == -1) {
    height = TREE_SIZE_;
  }
  let hash = hashEmpty(treeId, index, height);
  for (; height < TREE_SIZE_; height++) {
    const siblingIndex = siblings[height];
    const neighborHash =
        proof[height] || hashEmpty(treeId, siblingIndex, height);
    hash = (index.isBitSet(TREE_SIZE_ - height)) ?
        hashChildren(hash, neighborHash) :
        hashChildren(neighborHash, hash);
  }
  return e2e.compareByteArray(hash, rootHash);
};


exports = {
  hashChildren,
  hashEmpty,
  hashLeaf,
  TreeIndex,
  verifyInclusionProof,
  verifyExclusionProof
};
