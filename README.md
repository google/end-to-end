End-To-End
==========

End-To-End is a Chrome extension that helps you encrypt, decrypt, digital sign, and verify signed messages within the browser using OpenPGP.

This is the source code for the alpha release of the End-To-End Chrome extension. It's built upon a newly developed, JavaScript-based crypto library. End-To-End implements the OpenPGP standard, IETF RFC 4880, enabling key generation, encryption, decryption, digital signature, and signature verification. We’re releasing this code to enable community review; it is not yet ready for general use.

For more background, please see [our blog post](http://googleonlinesecurity.blogspot.com/2014/06/making-end-to-end-encryption-easier-to.html).

FAQs
====

### Since this is source, I could just build this and submit it to the Chrome Web Store

 Please don’t do this.

 The End-To-End team takes its responsibility to provide solid crypto very seriously, and we don’t want at-risk groups that may not be technically sophisticated — journalists, human-rights workers, et al — to rely on End-To-End until we feel it’s ready. Prematurely making End-To-End available could have very serious real world ramifications.

 One of the reasons we are doing this source code release is precisely so that the community as a whole can help us make sure that we haven’t overlooked anything in our implementation of End-To-End.

 Once we feel that End-To-End is ready, we will release it via the Chrome Web Store ourselves.

Using End-To-End
----------------

### Does End-To-End work on enclosures or only the body of a Gmail message?


 Only the body of the message. Please note that, as with all OpenPGP messages, the email subject line and list of recipients remain unencrypted.

### I forgot my keyring passphrase!

 If you forget your keyring’s passphrase, there is no way to recover your local keys. Please delete the extension, reinstall the extension, and then import the keys from your backup.

### How do I set a passphrase on my key?

 End-To-End implements passphrases per-keyring, not per-key as other OpenPGP software often does.

 Our goal with this choice is to minimize the number of (additional) passphrases you have to remember and enter. The End-To-End keyring passphrase is used to encrypt the keyring when it's persisted to localStorage. Each time the End-To-End extension loads, it will require the passphrase to be entered once to decrypt the keyring.

 If you import a private key that has a passphrase, End-To-End will ask you for that key's passphrase and decrypt the key. The imported key is then treated just like any other key.

### How does End-To-End find a public key when I send a message?

 The public key of a recipient needs to be imported into the local keyring before End-To-End can encrypt to it, or verify a signature from it.

### What happens if I delete my key and generate a new one?

Your old key will be lost forever. Unless you backed it up, of course.

### How can I just sign a message without encrypting it?

 To only sign, delete all of the addresses from the recipient’s box in End-To-End’s compose window.

### I’d like to import my End-To-End-generated private key into other OpenPGP software.

 End-To-End generates Elliptic Curve-based keys, so they're only supported in GnuPG 2.1 and later, as well as Symantec’s PGP software, but not in GnuPG 1.x or 2.0. We recommend that you either generate a key that you will use with the extension from now on, or generate a non-EC key in other OpenPGP software and import that.

 Please note that EC support was added to GnuPG 2.1 beta in 2010, but it hasn’t been released as a stable version yet. To communicate with other people that don't use End-To-End, you will need to either generate a key in GnuPG and then import it, or build GnuPG 2.1 yourself.

### There're no mentions of public and private keyrings; where are they?

 End-To-End uses a single keyring that contains both private and public keys. You can export individual keys from within the Keys and Settings page.

Technical
---------

### Why do you only support Elliptic Curve (EC) key generation?

 Generating RSA keypairs is very significantly slower than generating EC-based ones. EC-based keys are just as secure. Symantec’s PGP software and GnuPG 2.1 beta both support EC-based keys; we are greatly looking forward to a stable version of GnuPG 2.1 with EC support becoming available.

 Please note that you can import existing, non-EC-based keys into End-To-End.

### Will End-To-End work on mobile devices?

 Not at the moment. End-To-End is implemented as a Chrome extension, and Chrome on mobile devices doesn’t support extensions.

### Which RFCs does End-To-End support?

 [RFC 4880](http://tools.ietf.org/html/rfc4880) — OpenPGP Message Format

 [RFC 6337](http://tools.ietf.org/html/rfc6637) — Elliptic Curve Cryptography (ECC) in OpenPGP

 End-To-End does not currently support [RFC 3156](http://tools.ietf.org/html/rfc3156) or [RFC 5581](http://tools.ietf.org/html/rfc5581).

### I’ve found mojibake!

 We've made efforts to prevent [http://en.wikipedia.org/wiki/Mojibake mojibake]—for all non-Roman character encodings, not just Japanese—within messages, but you should not be surprised to encounter mojibake in non-message strings, including User IDs.

 We perform no automatic character set detection and rely on the presence of the OpenPGP Charset header.

### Are the private key(s) kept in memory, are they always purged after every operation, or is there a passphrase cache?

 The private keys are kept in memory unencrypted. We recommend making sure your keyring has a passphrase so that private keys are stored encrypted in localStorage.

### How safe are private keys in memory?

 In memory, the private key is sandboxed by Chrome from other things. When private keys are in localStorage they’re not protected by Chrome’s sandbox, which is why we encrypt them there.

 Please note that enabling Chrome’s "Automatically send usage statistics and crash reports to Google" means that, in the event of a crash, parts of memory containing private key material might be sent to Google.

JavaScript Crypto
-----------------

Implementing crypto in JavaScript is considered heretical by some. When we started work on End-To-End, there was no JavaScript crypto library that met our needs, so we built our own. During development we took into consideration all the criticisms and risks that we are aware of, and invested effort to mitigate these risks as much as possible.

### JavaScript has no native support for many core features used by cryptographic code

 Modern JavaScript engines have Typed Arrays; CS-PRNG is available thanks to WebCrypto.

### JavaScript cryptographic projects have had serious vulnerabilities in the past, reducing trust in JavaScript as an implementation language

 In practice, no common programming language prevents the code from having vulnerabilities.

 We hold ourselves to a higher standard; we started from scratch and created a testable, modern, cryptographic library. We created this new core library for End-To-End with support for BigInteger, modular arithmetic, Elliptic Curve, as well as symmetric and public-key encryption. Having done that, we then developed an OpenPGP implementation on top of it.

 Parts of End-To-End’s library are already in use within Google. We hope our code will be used widely in future JS cryptographic projects.

### JavaScript crypto has very real risk of side-channel attacks

 Since JavaScript code doesn't control the instructions being executed by the CPU — the JavaScript engine can perform optimizations out of the code’s control — it creates the risk of security-sensitive information leaks.

 End-To-End requires user interaction for private operations in normal use, mitigating this risk. Non-user-interaction actions are rate-limited and done in fixed time. End-To-End’s crypto operations are performed in a different process from the web apps it interacts with.

 The End-To-End library is as timing-aware it can be and we’ve invested effort to mitigate any exploitable risk.

### JavaScript code doesn't control memory; it's not really possible to reliably delete intermediate values

 The threat model we are trying to address discounts adversaries with physical access and users with malware outside the browser. Chrome’s design means that extensions should be safe against other extensions. Adversaries with this level of access have a plethora of attacks available to compromise data even in systems that control their memory carefully and wipe it.

### What about XSS and related bugs

 End-To-End uses Content Security Policy as well as inherently safe APIs in frameworks (strict Closure Templates). End-To-End doesn’t trust any website's DOM or context with unencrypted data. We have tried to ensure that the interaction between the extension and websites is minimal and does not reveal secrets to the website ([read more here](https://code.google.com/p/end-to-end/issues/detail?can=1&id=2 read more here)).

Bugs
----

### Are End-To-End security bugs eligible for Google’s Vulnerability Rewards Program?

 Yes, we have specifically expanded the scope of our Vulnerability Rewards Program to include End-To-End. This means that reports of exploitable security bugs within End-To-End are eligible for a reward.

### What about other bugs?

 One of the reasons our first launch is source code only is because our past experience tells us that brand new implementations of the OpenPGP standard need time to mature. We have every expectation of encountering interesting bugs, particularly ones related to interop with other OpenPGP software, and existing keys and messages.
