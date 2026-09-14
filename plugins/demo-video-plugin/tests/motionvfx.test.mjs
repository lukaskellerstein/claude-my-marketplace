// MotionVFX: the naming rules the local catalog depends on, and the public catalog the scout
// uses to look at an element before anyone spends a download on it. The network is mocked, so
// these tests run offline and prove the request we make, not MotionVFX's uptime.

import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogCollections, catalogElement, catalogSearch, classify, code4, packs, splitCode } from '../scripts/lib/motionvfx.mjs';

/** A fetch that records what was asked for and answers from a table of paths. */
function fakeFetch(answers) {
  const asked = [];
  const impl = async (url) => {
    asked.push(url);
    const { pathname, search } = new URL(url);
    const body = answers[pathname + search] ?? answers[pathname];
    if (!body) return { ok: false, status: 404, text: async () => '' };
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: body }) };
  };
  impl.asked = asked;
  return impl;
}

const ELEMENT = {
  token: 'FB5S',
  name: 'Keynote Lower3rd',
  detail_url: '/elements/FB5S',
  release_date: '2025-07-01',
  mac_fcp: true,
  extra_data: { duration: '150', frameRate: '30' },
  grid_prev_img_data: {
    3840: { jpeg: { src: 'https://s3.test/3840.jpeg', width: 3840, height: 2160 } },
    960: { jpeg: { src: 'https://s3.test/960.jpeg', width: 960, height: 540 } },
  },
  grid_prev_video_data: { 960: { h264: { src: 'https://s3.test/960.mp4', width: 960, height: 540 } } },
  style_list: [{ name: 'Presentation' }],
  tag_list: [{ name: 'typography' }],
};

test('a name ends in the code that identifies the element', () => {
  assert.deepEqual(splitCode('Keynote Lower3rd FB5S'), { base: 'Keynote Lower3rd', code: 'FB5S' });
  assert.deepEqual(splitCode('Basic Title'), { base: 'Basic Title', code: null });
});

test('a code is four characters, and anything else is refused before it becomes a URL', () => {
  assert.equal(code4('fb5s'), 'FB5S');
  for (const bad of ['FB5', 'FB5SS', '../../etc', '', null]) assert.throws(() => code4(bad), /not a MotionVFX 4-character code/);
});

test('roles come from the name, and the narrow rule wins', () => {
  const role = (name, kind = 'title', extra = {}) => classify({ name, base: name, kind, category: 'DesignStudio', ...extra });
  assert.equal(role('Keynote Lower3rd'), 'lower-third');
  assert.equal(role('Cursor Click'), 'cursor');
  assert.equal(role('Descriptive Callout'), 'callout');
  assert.equal(role('Next-Gen Title'), 'title');
  assert.equal(role('Gradient Flux', 'generator'), 'background');
  assert.equal(role('Next-Gen Technology Intro', 'generator'), 'intro');
  assert.equal(role('anything', 'transition'), 'transition');
  assert.equal(role('anything', 'effect'), 'effect');
  assert.equal(classify({ name: 'Glass', base: 'Glass', kind: 'title', category: 'mCaptions' }), 'caption-style');
});

test('a theme pack is a prefix shared by at least two of its parts', () => {
  const template = (name, kind = 'title') => ({ name, base: name, kind, vendor: 'motionvfx' });
  const found = packs([
    template('Next-Gen Title'),
    template('Next-Gen Lower3rd'),
    template('Next-Gen Transition', 'transition'),
    template('Next-Gen Technology Intro', 'generator'),
    template('Lonely Lower3rd'),
  ]);
  assert.deepEqual(found.map((p) => p.pack), ['Next-Gen']);
  assert.equal(found[0].members.length, 4, 'the pack generator joins its pack');
});

test('an element brings its preview still, its preview movie, and its real length', async () => {
  const fetchImpl = fakeFetch({ '/design-studio/api/v2/elements/FB5S': { results: ELEMENT } });
  const element = await catalogElement('fb5s', { fetchImpl, maxWidth: 960 });

  assert.equal(element.code, 'FB5S');
  assert.equal(element.localName, 'Keynote Lower3rd FB5S', 'this is the name the storyboard and --find take');
  assert.equal(element.seconds, 5, '150 frames at 30 fps');
  assert.equal(element.image.url, 'https://s3.test/960.jpeg', 'the largest rendition that is not wider than asked for');
  assert.equal(element.video.url, 'https://s3.test/960.mp4');
  assert.equal(element.url, 'https://www.motionvfx.com/design-studio/elements/FB5S');
  assert.deepEqual(element.styles, ['Presentation']);
});

test('search asks with q, because every other parameter name returns the whole catalog', async () => {
  const page = {
    q_total_results: 159,
    has_next: true,
    results: [
      { ...ELEMENT, token: 'AAAA', name: 'Cursor', fcp_kind: 'titles' },
      { ...ELEMENT, token: 'BBBB', name: 'Cursor Wipe', fcp_kind: 'transitions' },
      { ...ELEMENT, token: 'CCCC', name: 'Cursor Windows', mac_fcp: false, fcp_kind: 'titles' },
    ],
  };
  const fetchImpl = fakeFetch({ '/design-studio/api/v2/elements': page });
  const found = await catalogSearch({ text: 'cursor', kind: 'titles', limit: 2, maxPages: 1 }, { fetchImpl });

  assert.match(fetchImpl.asked[0], /[?&]q=cursor(&|$)/);
  assert.equal(found.total, 159, 'total is what the catalog matched, not what we return');
  assert.deepEqual(found.results.map((e) => e.code), ['AAAA'], 'the wrong kind and the non-FCP element are dropped');
});

test('collections report only what this Mac already has some of', async () => {
  const fetchImpl = fakeFetch({
    '/design-studio/api/v2/collections?include=id%2Cname%2Cslug%2Ctype&per_page=100&page=1': {
      has_next: false,
      results: [
        { id: 1, name: 'Next-Gen', slug: 'next-gen', type: 'system' },
        { id: 2, name: 'Weddings', slug: 'weddings', type: 'system' },
      ],
    },
    '/design-studio/api/v2/collections/next-gen/elements': {
      results: [
        { token: 'FB5S', name: 'Keynote Lower3rd', fcp_kind: 'titles' },
        { token: 'STAQ', name: 'Next-Gen Transition', fcp_kind: 'transitions' },
      ],
    },
    '/design-studio/api/v2/collections/weddings/elements': { results: [{ token: 'ZZZZ', name: 'Bouquet' }] },
  });

  const rows = await catalogCollections(['FB5S'], { fetchImpl, concurrency: 2 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Next-Gen');
  assert.deepEqual(rows[0], {
    name: 'Next-Gen',
    slug: 'next-gen',
    downloaded: 1,
    total: 2,
    codes: ['FB5S'],
    missing: [{ code: 'STAQ', name: 'Next-Gen Transition', kind: 'transitions' }],
  });
});

test('a failing request says which element failed instead of losing the whole shortlist', async () => {
  const fetchImpl = fakeFetch({ '/design-studio/api/v2/elements/FB5S': { results: ELEMENT } });
  const { catalogElements } = await import('../scripts/lib/motionvfx.mjs');
  const rows = await catalogElements(['FB5S', 'QQQQ'], { fetchImpl });
  assert.equal(rows.find((r) => r.code === 'FB5S').name, 'Keynote Lower3rd');
  assert.match(rows.find((r) => r.code === 'QQQQ').error, /404/);
});
