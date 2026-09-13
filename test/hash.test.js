'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc, ctx } = require('./load');

// printf '%s' "$input" | openssl dgst -<alg>; blake2b: python3 hashlib.blake2b(digest_size=32|64)
const vectors = {
  '': {
    md5: 'd41d8cd98f00b204e9800998ecf8427e',
    sha1: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
    sha224: 'd14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    sha384: '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b',
    sha512: 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
    'sha3-256': 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a',
    'sha3-512': 'a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26',
    keccak256: 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    ripemd160: '9c1185a5c5e9fc54612808977ee8f548b2258d31',
    'blake2b-256': '0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8',
    'blake2b-512': '786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce',
  },
  abc: {
    md5: '900150983cd24fb0d6963f7d28e17f72',
    sha1: 'a9993e364706816aba3e25717850c26c9cd0d89d',
    sha224: '23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7',
    sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    sha384: 'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
    sha512: 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    'sha3-256': '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    'sha3-512': 'b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0',
    keccak256: '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45',
    ripemd160: '8eb208f7e05d987a9b044a8e98c6b087f15a0bfc',
    'blake2b-256': 'bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319',
    'blake2b-512': 'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
  },
  // non-ASCII: every algorithm must hash the UTF-8 bytes
  'привет': {
    md5: '608333adc72f545078ede3aad71bfe74',
    sha1: 'e24505f94db2b5df4c7c2596b0788e720e073021',
    sha224: 'e6e821e0d80e88419e5b614b78f541585c74b189139c98d93865096a',
    sha256: 'e58f1e8c55fa105bdd3f40e5037eb0b039b5998d52c05e6cd98878dd2da5cab2',
    sha384: '967a08de85ccf06646513cd53c6b606426c07c59d0bc3acd387ae932ee6383d86f373a8a5cf36e0769c514cbc182e2f3',
    sha512: '544f0ba9e87f40e96803585fedd81fe4bc7b544af72257bbf6b75ae1a9175e607f93dab61df7eb1edcd0e1eaefcc997b3a4599d7c8af10f451083244ff37495e',
    'sha3-256': '6e8786aa5ae32fe05fde8e4b81528ebc561b83804dcedf3949f2bb674bc2f714',
    'sha3-512': '52a377f2b7013b1f0588628fb050e4210596d2e210c2e1e873650909c6783e175c473eee0bdf26c340c32343d2a4b872327b996ee1a19c7dbbe830ce04eb0da8',
    ripemd160: 'e4edcab443b82c7f7af71b8cb9f3a7639919b6d7',
    'blake2b-256': '6589635c7c64e2bcc7a4cb1f02120d026db6ddd8de6379edc3514d97319aa563',
    'blake2b-512': '8bd1c44777fa8b6d28aec2b328ad4a10b41688d7d5c0598e3879374f28cf771f05c36a68e0d1b1c54df044306bae07caa6578830617c9a37518b89ee5ef5f024',
  },
};

for (const [input, digests] of Object.entries(vectors)) {
  for (const [alg, expected] of Object.entries(digests)) {
    test(`${alg}(${JSON.stringify(input)})`, () => {
      assert.equal(calc('1' + alg, input), expected);
    });
  }
}

test('SRI and base64 hints', () => {
  // printf 'hello' | openssl dgst -sha384 -binary | base64
  assert.equal(calc('1sri', 'hello'), 'sha384-WeF0h3dEjGnea4ANejO7+5/xtGPkQ1TDVTvNucZm+pASWjx5+QOXvfX2oT3oKGhP');
  // printf 'hello' | openssl dgst -sha256 -binary | base64
  assert.equal(ctx.hasher.elements.h4.alt.title, 'Base64');
  assert.equal(ctx.hasher.elements.h4.alt.calculate('hello'), 'LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=');
  assert.match(ctx.hasher.elements.h6.alt.calculate('hello'), /^[A-Za-z0-9+/]{86}==$/);
});

test('row order: most used first, MD4 and Whirlpool gone', () => {
  const titles = Object.values(ctx.hasher.elements).filter((e) => e.tab === ctx.tabs.hash).map((e) => e.title);
  assert.deepEqual(Array.from(titles), ['SHA-256', 'SHA-512', 'SHA-1', 'MD5', 'SHA3-256', 'SHA3-512', 'Keccak-256', 'SHA-384', 'SHA-224', 'RIPEMD-160', 'BLAKE2b-256', 'BLAKE2b-512', 'SRI']);
});
