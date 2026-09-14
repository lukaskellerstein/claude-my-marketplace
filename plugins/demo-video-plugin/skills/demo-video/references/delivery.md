# Delivery: archive, restore, clean up

The pipeline ends with a folder full of drafts unless someone finishes it. This is that step.
It runs **after the user approves the actual final film**, never before.

Two things are true at once, and both have to survive: the film a viewer watches, and the
project someone can edit next year.

## 1. Write down what it is

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/fcp-finish-manifest.mjs --project .
```

Hashes every input and output, lists every template with its text layers and drop zones, and
records what FCPXML cannot carry. Read `byHand` out loud to yourself: everything in it exists
only inside the FCP library.

## 2. Consolidate — inside Final Cut Pro

A copy of the folder is not a copy of the project. Ask the user to do this in FCP, because only
FCP makes a consistent library:

1. Select the approved project → File → Copy Project to Library → New Library.
2. Tick **Copy original media**. Untick optimized and proxy media.
3. In the new library's Inspector, set **Storage Locations → Media: In Library**.
4. Close that library before touching it on disk. An open library has live database journals.

The result holds only the media this cut uses. For a 2-minute demo that is usually tens of
megabytes, not the whole working directory.

## 3. Keep this, drop that

Keep, under `demo/<videoId>/final/`:

- the approved film (the exact file the user watched — check its hash against the manifest);
- the consolidated `.fcpbundle`, zipped;
- `storyboard.json` and `timeline.json` as they were at approval;
- narration, music master, captions;
- `fcp-finish-manifest.json`;
- a `README.md`: how to reopen it, and what it needs installed.

Drop: render caches, proxies, the library's trash, old takes, `capture/raw/`, isolated app
state, and every superseded draft.

**Say what it still depends on.** Managed media makes the library self-contained; it does not
make it self-sufficient. MotionVFX templates and their fonts are licensed and installed per
machine, so list every template the film uses, with its 4-character code. Without that list the
library opens with red "missing effect" clips and nobody knows what they were.

## 4. Prove the archive restores

A valid ZIP proves nothing about a video.

1. Restore to a **fresh path**, with the original working folders renamed out of the way.
2. Open the restored library in FCP. The timeline must be whole: no missing media, no missing
   effects, logos still in their media wells.
3. Export a few seconds and look at the pixels.

If a dependency is missing, stop. Do not clean up.

## 5. The publishing package

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/youtube-package.mjs --project . --movie <the approved film>
```

Chapters come from the measured cut. Re-check YouTube's current limits when you prepare it and
record the date in `checks`. A thumbnail is made by a person or by the image-generation skill;
if there is none, say so rather than shipping an empty folder. The package never uploads,
publishes or schedules.

## 6. Cleanup — ask first

Cleanup is not implied by approval. Ask which the user wants to keep:

| Retention | Keeps | Costs |
|---|---|---|
| Editable delivery | the film, the library, the sources, the manifest | re-recording the UI needs a new preparation pass |
| Reproducible pipeline | all of the above plus `prep/`, `capture/`, `studio/` | gigabytes, and stale app state |

Then:

- Scope every removal to **one** `videoId`. Never run a recursive clean over `demo/`, and never
  touch another video's folder.
- Prefer moving to a recovery directory over deleting. Record the exact path, and say whether
  disk space was actually freed. A recovery directory is not a backup.
- Close only the libraries this task opened, and stop only the processes it started.
- Re-check the archive's hashes and the README's commands **after** cleaning.
- Report what remains, what was removed, and how to get it back.

## 7. What still needs its own permission

Approving a film authorises none of these. Ask for each, separately:

- `git commit`, `git push`, and adding large files to Git LFS;
- uploading, scheduling or publishing anything;
- deleting anything outside the agreed cleanup scope.
