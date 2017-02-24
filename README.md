End-To-End
==========

![Travis Build](https://travis-ci.org/google/end-to-end.svg "End to End Travis Build")

End-To-End is a crypto library to encrypt, decrypt, digital sign, and verify signed messages (implementing OpenPGP and OTR).

This is the source code for the End-To-End library. It's built upon a newly developed, JavaScript-based crypto library. End-To-End implements the OpenPGP standard, IETF RFC 4880, enabling key generation, encryption, decryption, digital signature, and signature verification.

We're releasing this library to enable community review.

For more background, please see [our blog post](http://googleonlinesecurity.blogspot.com/2014/06/making-end-to-end-encryption-easier-to.html).

Documentation for the project is stored in our [Wiki](https://github.com/google/end-to-end/wiki/). If you're planning to contribute to the project, check out our [Contributor guide](CONTRIBUTING.md).

A few projects have been built on top of this library, to list a few:
  - [E2EMail](https://github.com/e2email-org/e2email) - A Gmail client that exchanges OpenPGP mail.
  - [Freedom JS](https://github.com/freedomjs/freedom-pgp-e2e) - A framework for building peer-to-peer (P2P) web apps.
  - [uProxy](https://github.com/uProxy/uproxy) - A browser extension that lets users share their internet connection.
  - [Google End-to-End Extension](https://github.com/google/end-to-end/tree/master/src/javascript/crypto/e2e/extension) - Google End-to-End Chrome Extension (not ready for general use).
  - [Yahoo End-to-End Extension](https://github.com/yahoo/end-to-end) - A fork of Google's End-to-End for Yahoo mail.
