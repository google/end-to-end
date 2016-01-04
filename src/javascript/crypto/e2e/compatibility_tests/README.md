# OpenPGP interoperability tests driver

This directory contains a driver (a nodejs script) which runs the end-to-end
library against the
[OpenPGP interoperability tests](https://github.com/google/openpgp-interop).

The easiest way to run these tests is to use the [do.sh](../../../../../do.sh)
script as
```
$ do.sh test_compat_e2e
```

This will fetch the interoperability test cases if needed, build the library and
run the driver against the test cases.
