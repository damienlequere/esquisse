// Counts the lines of code of each app and package, split between source and tests.
// Files come from git (tracked + untracked, minus .gitignore), so build output is skipped.
// A line of code is a non-blank line that is not only a comment.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css"]);
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const TEST_DIR = /(^|\/)(__tests__|tests?|e2e)\//;

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => /^(apps|packages)\/[^/]+\//.test(file) && EXTENSIONS.has(extname(file)))
  .filter((file) => !file.endsWith(".d.ts"));

function countLines(text) {
  let count = 0;
  let inBlockComment = false;
  for (const raw of text.split("\n")) {
    let line = raw.trim();
    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      inBlockComment = false;
      line = line.slice(end + 2).trim();
    }
    if (line.startsWith("/*")) {
      const end = line.indexOf("*/", 2);
      if (end === -1) {
        inBlockComment = true;
        continue;
      }
      line = line.slice(end + 2).trim();
    }
    if (line === "" || line.startsWith("//")) continue;
    count++;
  }
  return count;
}

const workspaces = new Map();
for (const file of files) {
  const name = file.split("/").slice(0, 2).join("/");
  const kind = TEST_FILE.test(file) || TEST_DIR.test(file) ? "tests" : "source";
  const stats = workspaces.get(name) ?? {
    source: { files: 0, lines: 0 },
    tests: { files: 0, lines: 0 },
  };
  stats[kind].files++;
  stats[kind].lines += countLines(readFileSync(file, "utf8"));
  workspaces.set(name, stats);
}

const rows = [...workspaces].sort(([a], [b]) => a.localeCompare(b));
const total = { source: { files: 0, lines: 0 }, tests: { files: 0, lines: 0 } };
for (const [, stats] of rows) {
  for (const kind of ["source", "tests"]) {
    total[kind].files += stats[kind].files;
    total[kind].lines += stats[kind].lines;
  }
}
rows.push(["Total", total]);

const header = ["Workspace", "Source files", "Source LOC", "Test files", "Test LOC", "Total LOC"];
const table = rows.map(([name, s]) => [
  name,
  s.source.files,
  s.source.lines,
  s.tests.files,
  s.tests.lines,
  s.source.lines + s.tests.lines,
]);
const widths = header.map((h, i) => Math.max(h.length, ...table.map((r) => String(r[i]).length)));
const format = (row) =>
  row.map((cell, i) =>
    i === 0 ? String(cell).padEnd(widths[i]) : String(cell).padStart(widths[i]),
  );
const separator = widths.map((w) => "-".repeat(w)).join("  ");

console.log(format(header).join("  "));
console.log(separator);
for (const [i, row] of table.entries()) {
  if (i === table.length - 1) console.log(separator);
  console.log(format(row).join("  "));
}
