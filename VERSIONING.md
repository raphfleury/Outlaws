# Versioning in this repository

This repository holds one game, *Lone Hand*, in `Claude/`.

| Game | Folder | Tag | Changelog | Where the number lives |
| --- | --- | --- | --- | --- |
| Lone Hand (Claude version) | `Claude/` | `lone-hand-vX.Y.Z` | `Claude/CHANGELOG.md` | `Claude/source/package.json` |

## The number

`MAJOR.MINOR.PATCH`:

- `PATCH`: a fix; nothing new to play.
- `MINOR`: something new or changed that a player will notice: a place, a character, a
  control, a mode.
- `MAJOR`: a rebuilt game, or changes that make old habits or old links stop working.

Changes to documentation only (READMEs, screenshots, this file) get no version.

## Publishing a version of Lone Hand

1. Raise `version` in `package.json`. The build writes it onto the title screen.
2. Add a section at the top of `CHANGELOG.md`, with the date and the headings Added, Changed,
   Fixed, Removed as needed. Write it for players, in plain language.
3. Build, copy the game and the sources into `Claude/`, update the version line at the top of
   `Claude/README.md` and in the root `README.md`.
4. Commit and push.
5. Tag that commit `lone-hand-vX.Y.Z` (annotated) and push the tag.
6. Create the GitHub release for the tag, with the changelog section as its notes and
   `Claude/index.html` attached as `lone-hand-X.Y.Z.html`.

A pushed tag is never moved or deleted. A mistake is corrected by a new version.
