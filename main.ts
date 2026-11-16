// DANFO RUSH — the entry program (Node 22, standard library only).
//
// It hands the game in: it copies game/ and screenshots/ from beside this
// file into the output directory and writes /output/dossier.json with the
// vendored make.fun library, so the judge can read the game. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deterministic: the same repository writes the same bytes
// on every run, because it copies files and builds the dossier from them
// with no clock, no randomness and no network.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The bounty's own gate caps, so the program fails exactly where the
// scorer would refuse the entry (too many or too large screenshots,
// game/ past its file or byte caps, a path too long). Only
// text_max_bytes shapes the dossier's bytes; the rest are refusals.
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn(fromDir, toDir) {
  mkdirSync(toDir, { recursive: true });
  cpSync(join(fromDir, 'game'), join(toDir, 'game'), { recursive: true });
  mkdirSync(join(toDir, 'screenshots'), { recursive: true });
  if (existsSync(join(fromDir, 'screenshots'))) {
    cpSync(join(fromDir, 'screenshots'), join(toDir, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(toDir, 'dossier.json'), buildDossier(toDir, GATE_CAPS));
}

handIn(repoRoot, outputDir);
