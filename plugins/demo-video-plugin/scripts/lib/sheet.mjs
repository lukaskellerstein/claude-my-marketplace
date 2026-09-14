// One picture that holds many pictures. Reading images is the expensive part of choosing
// graphics, so every candidate goes into one contact sheet and the reader looks once.

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const MAX_CELLS = 36;
const CELL_W = 480;
const CELL_H = 270;
const GROUND = '0x303030';

/**
 * Lay the given image files out left to right, top to bottom, at most 4 across.
 * Returns where it was written and the grid, so the caller can print a legend that matches.
 */
export function contactSheet(out, images) {
  if (!images.length) throw new Error('nothing to put on a contact sheet');
  if (images.length > MAX_CELLS) throw new Error(`${images.length} images is too many for one sheet (max ${MAX_CELLS})`);
  const cols = Math.min(4, images.length);
  const rows = Math.ceil(images.length / cols);
  const inputs = images.flatMap((file) => ['-i', file]);
  // ffmpeg's xstack wants a full grid, so fill the last row with the sheet's own grey.
  for (let i = images.length; i < cols * rows; i++) inputs.push('-f', 'lavfi', '-i', `color=c=${GROUND}:s=${CELL_W}x${CELL_H}:d=1`);
  const cells = [...Array(cols * rows).keys()];
  const graph =
    cells
      .map(
        (i) =>
          `[${i}:v]scale=${CELL_W}:${CELL_H}:force_original_aspect_ratio=decrease,` +
          `pad=${CELL_W}:${CELL_H}:(ow-iw)/2:(oh-ih)/2:color=${GROUND},setsar=1[v${i}]`
      )
      .join(';') +
    `;${cells.map((i) => `[v${i}]`).join('')}xstack=inputs=${cells.length}:layout=${cells
      .map((i) => `${(i % cols) * CELL_W}_${Math.floor(i / cols) * CELL_H}`)
      .join('|')}`;
  const path = resolve(out);
  mkdirSync(dirname(path), { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', graph, '-frames:v', '1', path], { stdio: 'pipe' });
  return { sheet: path, cols, rows };
}

/** Where each image landed, so a legend reads the same way the eye scans the sheet. */
export function cellsOf(items, cols) {
  return items.map((item, i) => ({ cell: i + 1, row: Math.floor(i / cols) + 1, col: (i % cols) + 1, ...item }));
}
