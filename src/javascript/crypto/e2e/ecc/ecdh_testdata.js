/**
 * @license
 * Copyright 2013 Google Inc. All rights reserved.
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
 * @fileoverview Test data for verifying ECDH. These NIST provided test
 * vectors and others can be found at
 *     http://csrc.nist.gov/groups/STM/cavp/documents/components/ecccdhtestvectors.zip
 * @author thaidn@google.com (Thai Duong)
 */

goog.provide('e2e.ecc.ecdhTestData.NistVectors');
goog.setTestOnly();

goog.require('e2e.ecc.PrimeCurve');


/**
 * Test vectors for P-256/P-384/P-521, downloaded from NIST.
 *     - Q(Qx, Qy) is a public key;
 *     - d is a private key;
 *     - Z is the shared secret, which is the X coordinate of dQ.
 */
e2e.ecc.ecdhTestData.NistVectors = [
  {
    'curve': e2e.ecc.PrimeCurve.P_256,
    'Qx': '700c48f77f56584c5cc632ca65640db91b6bacce3a4df6b42ce7cc838833d287',
    'Qy': 'db71e509e3fd9b060ddb20ba5c51dcc5948d46fbf640dfe0441782cab85fa4ac',
    'd': '7d7dc5f71eb29ddaf80d6214632eeae03d9058af1fb6d22ed80badb62bc1a534',
    'Z': '46fc62106420ff012e54a434fbdd2d25ccc5852060561e68040dd7778997bd7b'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_256,
    'Qx': '809f04289c64348c01515eb03d5ce7ac1a8cb9498f5caa50197e58d43a86a7ae',
    'Qy': 'b29d84e811197f25eba8f5194092cb6ff440e26d4421011372461f579271cda3',
    'd': '38f65d6dce47676044d58ce5139582d568f64bb16098d179dbab07741dd5caf5',
    'Z': '057d636096cb80b67a8c038c890e887d1adfa4195e9b3ce241c8a778c59cda67'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_256,
    'Qx': 'df3989b9fa55495719b3cf46dccd28b5153f7808191dd518eff0c3cff2b705ed',
    'Qy': '422294ff46003429d739a33206c8752552c8ba54a270defc06e221e0feaf6ac4',
    'd': '207c43a79bfee03db6f4b944f53d2fb76cc49ef1c9c4d34d51b6c65c4db6932d',
    'Z': '96441259534b80f6aee3d287a6bb17b5094dd4277d9e294f8fe73e48bf2a0024'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_256,
    'Qx': '356c5a444c049a52fee0adeb7e5d82ae5aa83030bfff31bbf8ce2096cf161c4b',
    'Qy': '57d128de8b2a57a094d1a001e572173f96e8866ae352bf29cddaf92fc85b2f92',
    'd': '85a268f9d7772f990c36b42b0a331adc92b5941de0b862d5d89a347cbf8faab0',
    'Z': '1e51373bd2c6044c129c436e742a55be2a668a85ae08441b6756445df5493857'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_384,
    'Qx': 'a7c76b970c3b5fe8b05d2838ae04ab47697b9eaf52e764592efda27fe7513272' +
        '734466b400091adbf2d68c58e0c50066',
    'Qy': 'ac68f19f2e1cb879aed43a9969b91a0839c4c38a49749b661efedf243451915e' +
        'd0905a32b060992b468c64766fc8437a',
    'd': '3cc3122a68f0d95027ad38c067916ba0eb8c38894d22e1b15618b6818a661774a' +
        'd463b205da88cf699ab4d43c9cf98a1',
    'Z': '5f9d29dc5e31a163060356213669c8ce132e22f57c9a04f40ba7fcead493b457e' +
        '5621e766c40a2e3d4d6a04b25e533f1'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_384,
    'Qx': '30f43fcf2b6b00de53f624f1543090681839717d53c7c955d1d69efaf0349b736' +
        '3acb447240101cbb3af6641ce4b88e0',
    'Qy': '25e46c0c54f0162a77efcc27b6ea792002ae2ba82714299c860857a68153ab62e' +
        '525ec0530d81b5aa15897981e858757',
    'd': '92860c21bde06165f8e900c687f8ef0a05d14f290b3f07d8b3a8cc6404366e5d51' +
        '19cd6d03fb12dc58e89f13df9cd783',
    'Z': 'a23742a2c267d7425fda94b93f93bbcc24791ac51cd8fd501a238d40812f4cbfc5' +
        '9aac9520d758cf789c76300c69d2ff'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_521,
    'Qx': '000000685a48e86c79f0f0875f7bc18d25eb5fc8c0b07e5da4f4370f3a9490340' +
        '854334b1e1b87fa395464c60626124a4e70d0f785601d37c09870ebf176666877a2' +
        '046d',
    'Qy': '000001ba52c56fc8776d9e8f5db4f0cc27636d0b741bbe05400697942e80b7398' +
        '84a83bde99e0f6716939e632bc8986fa18dccd443a348b6c3e522497955a4f3c302' +
        'f676',
    'd': '0000017eecc07ab4b329068fba65e56a1f8890aa935e57134ae0ffcce802735151' +
        'f4eac6564f6ee9974c5e6887a1fefee5743ae2241bfeb95d5ce31ddcb6f9edb4d6f' +
        'c47',
    'Z': '005fc70477c3e63bc3954bd0df3ea0d1f41ee21746ed95fc5e1fdf90930d5e1366' +
        '72d72cc770742d1711c3c3a4c334a0ad9759436a4d3c5bf6e74b9578fac148c831'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_521,
    'Qx': '000001df277c152108349bc34d539ee0cf06b24f5d3500677b4445453ccc21409' +
        '453aafb8a72a0be9ebe54d12270aa51b3ab7f316aa5e74a951c5e53f74cd95fc29a' +
        'ee7a',
    'Qy': '0000013d52f33a9f3c14384d1587fa8abe7aed74bc33749ad9c570b471776422c' +
        '7d4505d9b0a96b3bfac041e4c6a6990ae7f700e5b4a6640229112deafa0cd8bb0d0' +
        '89b0',
    'd': '000000816f19c1fb10ef94d4a1d81c156ec3d1de08b66761f03f06ee4bb9dcebbb' +
        'fe1eaa1ed49a6a990838d8ed318c14d74cc872f95d05d07ad50f621ceb620cd905c' +
        'fb8',
    'Z': '000b3920ac830ade812c8f96805da2236e002acbbf13596a9ab254d44d0e91b625' +
        '5ebf1229f366fb5a05c5884ef46032c26d42189273ca4efa4c3db6bd12a6853759'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_521,
    'Qx': '00000092db3142564d27a5f0006f819908fba1b85038a5bc2509906a497daac67' +
        'fd7aee0fc2daba4e4334eeaef0e0019204b471cd88024f82115d8149cc0cf4f7ce1' +
        'a4d5',
    'Qy': '0000016bad0623f517b158d9881841d2571efbad63f85cbe2e581960c5d670601' +
        'a6760272675a548996217e4ab2b8ebce31d71fca63fcc3c08e91c1d8edd91cf6fe8' +
        '45f8',
    'd': '0000012f2e0c6d9e9d117ceb9723bced02eb3d4eebf5feeaf8ee0113ccd8057b13' +
        'ddd416e0b74280c2d0ba8ed291c443bc1b141caf8afb3a71f97f57c225c03e1e4d4' +
        '2b0',
    'Z': '006b380a6e95679277cfee4e8353bf96ef2a1ebdd060749f2f046fe571053740bb' +
        'cc9a0b55790bc9ab56c3208aa05ddf746a10a3ad694daae00d980d944aabc6a08f'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_521,
    'Qx': '0000004f38816681771289ce0cb83a5e29a1ab06fc91f786994b23708ff08a08a' +
        '0f675b809ae99e9f9967eb1a49f196057d69e50d6dedb4dd2d9a81c02bdcc8f7f51' +
        '8460',
    'Qy': '0000009efb244c8b91087de1eed766500f0e81530752d469256ef79f6b965d8a2' +
        '232a0c2dbc4e8e1d09214bab38485be6e357c4200d073b52f04e4a16fc6f5247187' +
        'aecb',
    'd': '0000005dc33aeda03c2eb233014ee468dff753b72f73b00991043ea353828ae69d' +
        '4cd0fadeda7bb278b535d7c57406ff2e6e473a5a4ff98e90f90d6dadd25100e8d85' +
        '666',
    'Z': '00c2bfafcd7fbd3e2fd1c750fdea61e70bd4787a7e68468c574ee99ebc47eedef0' +
        '64e8944a73bcb7913dbab5d93dca660d216c553622362794f7a2acc71022bdb16f'
  },
  {
    'curve': e2e.ecc.PrimeCurve.P_521,
    'Qx': '000001a32099b02c0bd85371f60b0dd20890e6c7af048c8179890fda308b359db' +
        'bc2b7a832bb8c6526c4af99a7ea3f0b3cb96ae1eb7684132795c478ad6f962e4a6f' +
        '446d',
    'Qy': '0000017627357b39e9d7632a1370b3e93c1afb5c851b910eb4ead0c9d387df67c' +
        'de85003e0e427552f1cd09059aad0262e235cce5fba8cedc4fdc1463da76dcd4b6d' +
        '1a46',
    'd': '000000df14b1f1432a7b0fb053965fd8643afee26b2451ecb6a8a53a655d5fbe16' +
        'e4c64ce8647225eb11e7fdcb23627471dffc5c2523bd2ae89957cba3a57a23933e5' +
        'a78',
    'Z': '01aaf24e5d47e4080c18c55ea35581cd8da30f1a079565045d2008d51b12d0abb4' +
        '411cda7a0785b15d149ed301a3697062f42da237aa7f07e0af3fd00eb1800d9c41'
  }
];
