// How the generator's commands talk to the studio (apps/studio), which runs
// them as the terminal would and sets ESQUISSE_STUDIO: each question (see
// session in session.ts) and each render (see show in paint.ts) is one line of
// JSON after STUDIO, which the studio turns into buttons, a text field or an
// image; the answer comes back on stdin, one line, as typed in the terminal.

export const STUDIO = "@studio ";

export const inStudio = process.env.ESQUISSE_STUDIO === "1";

export const toStudio = (event: Record<string, unknown>) => `\n${STUDIO}${JSON.stringify(event)}\n`;
