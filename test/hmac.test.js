'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calc, ctx } = require('./load');

// printf '%s' "$input" | openssl dgst -<alg> -hmac key
const vectors = {
  '': {
    md5: '63530468a04e386459855da0063b6596',
    sha1: 'f42bb0eeb018ebbd4597ae7213711ec60760843f',
    sha256: '5d5d139563c95b5967b9bd9a8c9b233a9dedb45072794cd232dc1b74832607d0',
    sha384: '99f44bb4e73c9d0ef26533596c8d8a32a5f8c10a9b997d30d89a7e35ba1ccf200b985f72431202b891fe350da410e43f',
    sha512: '84fa5aa0279bbc473267d05a53ea03310a987cecc4c1535ff29b6d76b8f1444a728df3aadb89d4a9a6709e1998f373566e8f824a8ca93b1821f0b69bc2a2f65e',
  },
  abc: {
    md5: 'd2fe98063f876b03193afb49b4979591',
    sha1: '4fd0b215276ef12f2b3e4c8ecac2811498b656fc',
    sha256: '9c196e32dc0175f86f4b1cb89289d6619de6bee699e4c378e68309ed97a1a6ab',
    sha384: '30ddb9c8f347cffbfb44e519d814f074cf4047a55d6f563324f1c6a33920e5edfb2a34bac60bdc96cd33a95623d7d638',
    sha512: '3926a207c8c42b0c41792cbd3e1a1aaaf5f7a25704f62dfc939c4987dd7ce060009c5bb1c2447355b3216f10b537e9afa7b64a4e5391b0d631172d07939e087a',
  },
  'привет': {
    md5: '633dd699caf7c6e12cccdbfdfc2ce367',
    sha1: 'b9b470ad07430a036700247847d58ad78f083693',
    sha256: '39d062149e5ab107f3ed155ac4b4d8e8a01b2950c47df5729e1fea3f44af5171',
    sha384: '86a0ac84972fbf3e566bee5a06dd71926ee6a0c6fd76e370c11aafd91f7c8e6e0e625861114a62537cdd0c6bca70c955',
    sha512: 'b2adac1d8ec79cb10543026ca72bcfb7c1b8335e92754d6c6ee2334f9af93516857bfac68d54429ce8912b23e1a14c1e3ea42ab83ca822e2a12d5ed2187ee527',
  },
};

for (const [input, digests] of Object.entries(vectors)) {
  for (const [alg, expected] of Object.entries(digests)) {
    test(`hmac-${alg}(${JSON.stringify(input)}, "key")`, () => {
      assert.equal(calc('2' + alg, input, 'key'), expected);
    });
  }
}

test('hmac with a key longer than the block size', () => {
  // printf 'abc' | openssl dgst -sha256 -hmac "$(printf 'k%.0s' {1..100})"
  assert.equal(calc('2sha256', 'abc', 'k'.repeat(100)), 'b58b2b694fdba0dd76da3ebe99174f728d327560f36ece224e90867972479922');
});

test('row order and base64 hints', () => {
  const titles = Object.values(ctx.hasher.elements).filter((e) => e.tab === ctx.tabs.hmac).map((e) => e.title);
  assert.deepEqual(Array.from(titles), ['HMAC-SHA256', 'HMAC-SHA1', 'HMAC-SHA512', 'HMAC-SHA384', 'HMAC-MD5']);
  // printf 'abc' | openssl dgst -sha256 -hmac key -binary | base64
  assert.equal(ctx.hasher.elements.hm4.alt.calculate('abc', 'key'), 'nBluMtwBdfhvSxy4konWYZ3mvuaZ5MN45oMJ7Zehpqs=');
  assert.equal(ctx.hasher.elements.hm6.alt.title, 'Base64');
});
