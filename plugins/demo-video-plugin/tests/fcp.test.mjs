// The Final Cut Pro catalog: what is downloaded, what is only a placeholder, and how a
// published parameter is addressed. These three facts decide whether an export works, and all
// three were learned from a real import that went wrong, so they are worth a test.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';

import { inspectTemplate, listTemplates, resolveTemplate, storyboardTemplateRefs } from '../scripts/lib/fcp.mjs';

const write = (file, body = '<ozml/>') => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return file;
};

test('a downloaded element and an mExtension placeholder are told apart', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'demo-video-fcp-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const ready = write(join(root, 'Titles.localized', 'DesignStudio', 'Keynote Lower3rd FB5S', 'Keynote Lower3rd FB5S.moti'));
  write(join(root, 'Titles.localized', 'DesignStudio', '.mExt-Placeholders', 'Placeholder-01.moti'));
  // mExtension lists the rest of its catalog as links to that one stand-in.
  const listed = join(root, 'Titles.localized', 'DesignStudio', 'Next-Gen Title 6SMY', 'Next-Gen Title 6SMY.moti');
  mkdirSync(dirname(listed), { recursive: true });
  symlinkSync(relative(dirname(listed), join(root, 'Titles.localized', 'DesignStudio', '.mExt-Placeholders', 'Placeholder-01.moti')), listed);
  write(join(root, 'Transitions.localized', 'DesignStudio', 'Next-Gen Transition STAQ', 'Next-Gen Transition STAQ.motr'));
  write(join(root, 'Effects.localized', 'Acme', 'Bloom', 'Bloom.moef'));
  // A downloaded MotionVFX element carries an identity file next to the template.
  writeFileSync(join(dirname(ready), '.identity-abc123'), '');
  writeFileSync(join(dirname(ready), 'large.png'), '');

  const all = listTemplates({ apps: [], userRoot: root });
  const by = new Map(all.map((template) => [template.name, template]));

  assert.equal(by.get('Keynote Lower3rd FB5S').status, 'ready');
  assert.equal(by.get('Keynote Lower3rd FB5S').vendor, 'motionvfx');
  assert.equal(by.get('Keynote Lower3rd FB5S').code, 'FB5S');
  assert.equal(by.get('Keynote Lower3rd FB5S').role, 'lower-third');
  assert.equal(by.get('Keynote Lower3rd FB5S').thumb, join(dirname(ready), 'large.png'));

  assert.equal(by.get('Next-Gen Title 6SMY').status, 'placeholder');
  assert.equal(by.get('Next-Gen Title 6SMY').thumb, undefined, 'a placeholder has no picture to judge it by');
  assert.equal(by.get('Next-Gen Transition STAQ').kind, 'transition');
  assert.equal(by.get('Bloom').vendor, null, 'a pack without an identity file is not MotionVFX');
  assert.equal(
    all.some((template) => template.name.startsWith('Placeholder-')),
    false,
    'the shared stand-ins are not templates of their own'
  );
});

test('a template is found by name, by code, and by name without its code', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'demo-video-fcp-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  write(join(root, 'Titles.localized', 'DesignStudio', 'Keynote Lower3rd FB5S', 'Keynote Lower3rd FB5S.moti'));
  const templates = listTemplates({ apps: [], userRoot: root });

  for (const query of ['Keynote Lower3rd FB5S', 'keynote lower3rd fb5s', 'FB5S', 'fb5s', 'Keynote Lower3rd']) {
    assert.equal(resolveTemplate(query, { templates }).template?.name, 'Keynote Lower3rd FB5S', `"${query}" should resolve`);
  }
  assert.equal(resolveTemplate('Nothing Like This', { templates }).status, 'missing');
  assert.equal(resolveTemplate('FB5S', { kind: 'transition', templates }).status, 'missing', 'a title cannot fill a transition slot');
});

// FCP addresses a published parameter as 9999 / every group and layer above the object /
// the object / the channel. A key missing the enclosing group is dropped silently on import,
// which looks exactly like a template that ignores the parameter.
const OZML = `<?xml version="1.0"?>
<ozml>
  <scene>
    <sceneSettings><width>1920</width><height>1080</height><duration>150</duration><frameRate>30</frameRate></sceneSettings>
    <factory id="7"><description>Text</description></factory>
    <group id="100" name="Master">
      <layer id="200" name="Title Background"/>
      <scenenode name="Title 2" id="301" factoryID="7"><text>SUBTITLE</text><font>Roboto</font></scenenode>
      <scenenode name="Title 1" id="302" factoryID="7"><text>HEADLINE</text><font>Roboto</font></scenenode>
      <scenenode name="Control" id="400" pluginName="mOSC"/>
    </group>
    <publishSettings>
      <target object="400" channel="./2/1/13" name="Content Position"/>
      <target object="302" channel="./1" name="Headline"/>
      <target object="500" channel="./1" name="Drop Zone 1"/>
    </publishSettings>
  </scene>
</ozml>`;

test('inspect reads length, text layers in file order, keys, and how the element can be moved', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'demo-video-fcp-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = write(join(root, 'Keynote Lower3rd FB5S.moti'), OZML);
  const info = inspectTemplate(file);

  assert.equal(info.seconds, 5);
  assert.equal(info.durationFrames, 150);
  assert.deepEqual([info.width, info.height], [1920, 1080]);
  // File order, not visual order: FCP fills <text> elements in the order they appear here.
  assert.deepEqual(info.texts.map((text) => text.layer), ['Title 2', 'Title 1']);
  assert.deepEqual(info.texts.map((text) => text.text), ['SUBTITLE', 'HEADLINE']);
  assert.deepEqual(info.fonts, ['Roboto']);

  assert.equal(info.keys['Content Position'], '9999/100/400/2/1/13');
  assert.equal(info.keys.Headline, '9999/100/302/1');
  assert.equal(info.keys['Drop Zone 1'], undefined, 'a target whose object is not in the tree has no key');
  assert.deepEqual(info.dropZones, ['Drop Zone 1']);
  // It has mOSC's own control, so the element can be moved without dragging the footage with it.
  assert.equal(info.placement, 'content-position');
});

test('a template without a position control, that draws the footage, is left where it is', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'demo-video-fcp-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = write(join(root, 'Fixed.moti'), OZML.replace(/<target object="400"[^>]*\/>/, '').replace('pluginName="mOSC"', ''));
  assert.equal(inspectTemplate(file).placement, 'fixed');
});

test('every template the storyboard names is reported with where it was named', () => {
  const refs = storyboardTemplateRefs({
    meta: { fcp: { titleTemplate: 'A', lowerThirdTemplate: 'B', transitionTemplate: 'C', backgroundTemplate: 'none' } },
    sections: [
      { id: '03-search', fcp: { lowerThirdText: ['x'], effects: ['E'], overlays: [{ template: 'O', at: { action: 1 } }] } },
      { id: '04-close', fcp: { titleTemplate: 'T', backgroundTemplate: 'none' } },
    ],
  });
  const named = refs.map((ref) => ref.name);
  assert.deepEqual(named, ['A', 'B', 'C', 'E', 'O', 'T']);
  assert.equal(
    named.includes('none'),
    false,
    '"none" removes a global choice for one section; it is not the name of a template'
  );
  assert.equal(refs.find((ref) => ref.name === 'E').where, 'sections[03-search].fcp.effects[0]');
  assert.deepEqual(refs.find((ref) => ref.name === 'C').kind, ['transition']);
});
