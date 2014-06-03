// Copyright 2013 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/**
 * @fileoverview Test data for the key ring.
 * @author thaidn@google.com (Thai Duong).
 */

goog.provide('e2e.openpgp.KeyRing.testData');
goog.setTestOnly('e2e.openpgp.KeyRing.testData');



/**
 * An ECC public key.
 */
e2e.openpgp.KeyRing.testData.pubKeyAscii =
    '-----BEGIN PGP PUBLIC KEY BLOCK-----\n' +
    'Version: GnuPG v2.1.0-ecc (GNU/Linux)\n' +
    '\n' +
    'mFIEUh5AoBMIKoZIzj0DAQcCAwT68182duSEJFXKa+qkBa0Vgeswnv8GP8tKYiU/\n' +
    'MCZd6dGTvrtf2gSjyAsVkB0V0idW7i8yW1wfh3y2AbGWDr/dtB9lY2MgcmVhbCBu\n' +
    'YW1lIDxlY2NAZXhhbXBsZS5jb20+iHoEExMIACIFAlIeQKACGwMGCwkIBwMCBhUI\n' +
    'AgkKCwQWAgMBAh4BAheAAAoJEOrrinav6MhnxtcA/iAteDFo/P5SU5XV/8/4BN9x\n' +
    'f28SuvwFipnjjyOmvB0eAP4kPM5LAp2EW+QIyG6+CJP1No9uWyZTdLPkTRgLtYhi\n' +
    'GLhWBFIeQKASCCqGSM49AwEHAgMEgk1dVpgPCM38NBNoBcvehm7mt6aUmK8mDb/M\n' +
    'SHo2/NlwfTh+BDCoVX5asSetzuW2RbnP6sCBwfsuLSrSWUVauwMBCAeIYQQYEwgA\n' +
    'CQUCUh5AoAIbDAAKCRDq64p2r+jIZzqQAQCcv0VOQFiNOM6JNdLHTqlCYxeoz09d\n' +
    'UP3LdgcnLED/YwD9FqcNrkok9BuXJ9+rXTSu+uqdWB7gpMO9mfk65d5IQ+s=\n' +
    '=xRCj\n' +
    '-----END PGP PUBLIC KEY BLOCK-----';

/**
 * An ECC private key, generated and exported by End to End.
 */
e2e.openpgp.KeyRing.testData.privKeyAscii =
    '-----BEGIN PGP PRIVATE KEY BLOCK-----\n' +
    '\n' +
    'xv8AAABSBF666PETCCqGSM49AwEHAgMELGfMoJnUCIQTFNMVYrInh2ux3nkSH8aB\n' +
    'Ft9sn1F5rrXlmcgHzTmL+mvTWgeKkITYrux947QLuiXC0diFgwUUo83/AAAAHlRo\n' +
    'YWkgRHVvbmcgPHRoYWlkbkBnb29nbGUuY29tPsb/AAAAVgReuulPEggqhkjOPQMB\n' +
    'BwIDBB07JKiYVaz4Tn16J64mTB6rgxSJVInuf7mGCDW9xvC/lemRbzUYqqvBvAob\n' +
    '/zzy+rN4uMnh53pOR1hSYIZjfsIDAQgHzf8AAAAeVGhhaSBEdW9uZyA8dGhhaWRu\n' +
    'QGdvb2dsZS5jb20+xf8AAAB3BF666PETCCqGSM49AwEHAgMELGfMoJnUCIQTFNMV\n' +
    'YrInh2ux3nkSH8aBFt9sn1F5rrXlmcgHzTmL+mvTWgeKkITYrux947QLuiXC0diF\n' +
    'gwUUowABAOqm8CXBp9ptapuKpuGuyoim1rPaPAUycscv4wOCzpowEk/N/wAAAB5U\n' +
    'aGFpIER1b25nIDx0aGFpZG5AZ29vZ2xlLmNvbT7F/wAAAHsEXrrpTxIIKoZIzj0D\n' +
    'AQcCAwQdOySomFWs+E59eieuJkweq4MUiVSJ7n+5hgg1vcbwv5XpkW81GKqrwbwK\n' +
    'G/888vqzeLjJ4ed6TkdYUmCGY37CAwEIBwAA/1Ev1ViOZlYTw7HU6bWNorBCxHc1\n' +
    '7KaEAVscJaAcUn4LD8rN/wAAAB5UaGFpIER1b25nIDx0aGFpZG5AZ29vZ2xlLmNv\n' +
    'bT4=\n' +
    '=9JJ3\n' +
    '-----END PGP PRIVATE KEY BLOCK-----';

/**
 * ECC private key, from b/11712004.
 */
e2e.openpgp.KeyRing.testData.privKeyAscii2 =
    '-----BEGIN PGP PRIVATE KEY BLOCK-----\n' +
    '\n' +
    'xv8AAABSBF2XzQETCCqGSM49AwEHAgME1cUyHydObWMgA23//9nVaZWtUtTr2r7v\n' +
    'doXsq0pYxXCX9ag7AItRRVGN6zdpgDf0qLPa8IRYYa8Kvp36dJk5Bc3/AAAAEXRl\n' +
    'c3RrZXkgPHllc3lrZXk+xv8AAABWBF2XzX4SCCqGSM49AwEHAgMEhwR1rA/UMPue\n' +
    'zdJCHpK405hvc1v9onav7XIGL+bW9Dn6UP420H2Nl6xhoaB3s1KEg5CtSpYFaNTa\n' +
    'bsilRqVUuAMBCAfN/wAAABF0ZXN0a2V5IDx5ZXN5a2V5PsX/AAAAdwRdl80BEwgq\n' +
    'hkjOPQMBBwIDBNXFMh8nTm1jIANt///Z1WmVrVLU69q+73aF7KtKWMVwl/WoOwCL\n' +
    'UUVRjes3aYA39Kiz2vCEWGGvCr6d+nSZOQUAAP96GAcbRyYuINA3MJr+4WVXU0Bc\n' +
    'uaUMGo5dymMkcLEE0w2Bzf8AAAARdGVzdGtleSA8eWVzeWtleT7F/wAAAHsEXZfN\n' +
    'fhIIKoZIzj0DAQcCAwSHBHWsD9Qw+57N0kIekrjTmG9zW/2idq/tcgYv5tb0OfpQ\n' +
    '/jbQfY2XrGGhoHezUoSDkK1KlgVo1NpuyKVGpVS4AwEIBwABAOHCO66LbqluEyYb\n' +
    'eL93EnunwwPenNtfGVPODmjvc0vhD4vN/wAAABF0ZXN0a2V5IDx5ZXN5a2V5Pg==\n' +
    '=jodu\n' +
    '-----END PGP PRIVATE KEY BLOCK-----';


/**
 * Old style keyring with partially serialized key packets.
 */
e2e.openpgp.KeyRing.testData.keyRingOldStyle = 'U{"pubKey":{' +
    '"Drew Hintz <adhintz@google.com>":["BFir2cUTCCqGSM49AwEHAgM' +
    'ERh6l2ToYyzlvyRSEqkZSAxrXy6TGs6TRFmAHwW4wtkRtYFoe+DyUbU5qod' +
    'cyjAFFmVnNxTukBDOQOjPJiOFZ6A==",' +
    '"BFir2kMSCCqGSM49AwEHAgMEABY1dRP3D8aYyeFi0yha69rBMJi6JLZkgw' +
    'pcd0rKVQDmZAnEhTFzdZUcD5JK2cx5Wj3eNTljHsqSl1F9/eGNkgMBCAc="' +
    '],' +
    '"Thai Duong <thaidn@google.com>":["BF/3aSETCCqGSM49AwEHAgME' +
    'eFaL8yASJLutOZQcXTiCeMPEXCLI7aZlSC60qElzWe6YqJbiry5o9FdcONi' +
    'kInIbKvGXvBG3c67ySWk4qMwZUQ==",' +
    '"BF/3aesSCCqGSM49AwEHAgMEYqZrTdWnH8QCkbjAjurjIkXM8FPddwqs6F' +
    'blb1WElM335j8aIXssb+GFC3adXx6JuwmHUviFWoD/MktJLkn90gMBCAc="' +
    '],' +
    '"Radoslav Vasilev <radi@google.com>":["BJ3LIAMTCCqGSM49AwEH' +
    'AgMENtQtEEDfXseIscn+teabmX1TOlZLUT6J+Q1gjRgBhFAxJnOy+rWfzOB' +
    'OUat83DES0HQoo1ELcZosDRqF7dMgjw==",' +
    '"BJ3LIMoSCCqGSM49AwEHAgMEIXahSRLiErNVpt8H0qvYx+5cvU8rOBssrg' +
    'EVzBxssDcO7nIjMBfCP+8AOB/VH6+bGZfQYv/G/bwbgusfq0UPcQMBCAc="' +
    ']},' +
    '"privKey":{' +
    '"Thai Duong <thaidn@google.com>":["BF666PETCCqGSM49AwEHAgME' +
    'LGfMoJnUCIQTFNMVYrInh2ux3nkSH8aBFt9sn1F5rrXlmcgHzTmL+mvTWge' +
    'KkITYrux947QLuiXC0diFgwUUowABAOqm8CXBp9ptapuKpuGuyoim1rPaPA' +
    'Uycscv4wOCzpowEk8=",' +
    '"BF666U8SCCqGSM49AwEHAgMEHTskqJhVrPhOfXonriZMHquDFIlUie5/uY' +
    'YINb3G8L+V6ZFvNRiqq8G8Chv/PPL6s3i4yeHnek5HWFJghmN+wgMBCAcAA' +
    'P9RL9VYjmZWE8Ox1Om1jaKwQsR3NeymhAFbHCWgHFJ+Cw/K"' +
    ']}}';
