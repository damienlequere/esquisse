import { artOf } from "./art.ts";

// A command's options, each "--name <value>", anywhere in its arguments: taken
// out of them, so that what is left is the command's own.

export const option = (argv: string[], name: string, usage: string) => {
  const at = argv.indexOf(name);
  if (at === -1) return undefined;
  const value = argv[at + 1];
  if (value === undefined || value.startsWith("--"))
    throw new Error(`${name} needs a value.\n${usage}`);
  argv.splice(at, 2);
  return value;
};

// --art, the images' direction: a preset's id (see art.ts), or a text of its own.
export const artOption = (argv: string[], usage: string) => {
  const value = option(argv, "--art", usage)?.trim();
  if (value === undefined) return undefined;
  if (value === "") throw new Error(`--art is empty.\n${usage}`);
  return artOf(value);
};
