import path from 'node:path';
import { projectRoot, verifyBaseline } from './release-baseline.mjs';

const target = process.argv[2];
const manifest = await verifyBaseline(target ? path.resolve(projectRoot, target) : undefined);
console.log(`2.0 preserved: ${manifest.files.length} SHA-256 matches (${target || 'frozen release + shared public assets'}).`);
