import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');
const PATTERNS = [
  /teacher\.firstName/,
  /teacher\.lastName/,
  /teacher\.fullName/,
  /\.teacher\b/,
];

const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.vite'];
const EXCLUDE_FILES = ['.test.', '.spec.'];

/** @type {Array<{ file: string; line: number; text: string; pattern: string }>} */
const results = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      walk(full);
      continue;
    }

    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    if (EXCLUDE_FILES.some((e) => entry.name.includes(e))) continue;

    const content = fs.readFileSync(full, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      for (const pattern of PATTERNS) {
        if (pattern.test(line)) {
          results.push({
            file: path.relative(process.cwd(), full),
            line: idx + 1,
            text: line.trim(),
            pattern: pattern.source,
          });
          break; // no duplicar si varias regex coinciden
        }
      }
    });
  }
}

walk(ROOT);

// Agrupar por archivo
const byFile = new Map();
for (const r of results) {
  if (!byFile.has(r.file)) byFile.set(r.file, []);
  byFile.get(r.file).push(r);
}

console.log(`\n📁 ${byFile.size} archivo(s) con referencias a "teacher"\n`);

for (const [file, refs] of byFile) {
  console.log(`\n🔸 ${file}`);
  for (const r of refs) {
    console.log(`   L${r.line.toString().padStart(4)}: ${r.text}`);
  }
}

console.log(`\n✅ Total: ${results.length} referencia(s)\n`);