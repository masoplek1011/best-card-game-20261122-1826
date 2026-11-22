// main.ts — the entrypoint the grader runs (Node 22, standard library only).
// It copies the game and its screenshots into the output directory and
// writes dossier.json with buildDossier from vendor/makefun-game.ts, so the
// dossier is byte for byte what the kit's library writes from those files.
// It writes nothing into the repository: every output goes to
// MAKEFUN_OUTPUT_DIR (or /output), which the grader provides writable.
// NOTE: never remove the output directory itself — in the grader it is a
// mount the runner (uid 65534) cannot delete, and rmSync on it fails with
// EPERM and exit 1. Only create it and overwrite its contents (the starter
// does the same); the grader runs the program twice into the same directory
// and the second run overwrites the first byte for byte.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = new URL('./game', import.meta.url).pathname;
const shotsDir = new URL('./screenshots', import.meta.url).pathname;

mkdirSync(outDir, { recursive: true });

cpSync(gameDir, `${outDir}/game`, { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, `${outDir}/screenshots`, { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(`${outDir}/dossier.json`, dossier);
console.log(`wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
