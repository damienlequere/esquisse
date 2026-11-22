"use client";

// What is selected in a scene, in fields: an object (its name, its actions,
// what it holds), a character (its place, its dialogue, its layer), or the
// scene itself (its texts, its back button, what it was generated from).

import {
  type Character,
  CONTAINER_SLOTS,
  type Items,
  type ObjectAction,
  type SceneData,
  type SceneObject,
  sceneExits,
} from "@esquisse/engine";
import { type ReactNode, useEffect, useState } from "react";
import { Button, Field, Section, TextArea } from "../ui.tsx";

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

type Change = (doc: SceneData, key?: string) => void;

// An id, changed when the field is left, if it is valid and free.
const IdField = ({
  value,
  taken,
  onCommit,
  readOnly,
  hint,
}: {
  value: string;
  taken: string[];
  onCommit(id: string): void;
  readOnly?: boolean;
  hint?: ReactNode;
}) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const problem =
    text === value
      ? undefined
      : !ID.test(text)
        ? "kebab-case: a-z, 0-9, dashes"
        : taken.includes(text)
          ? "already taken"
          : undefined;
  const commit = () => {
    if (text !== value && problem === undefined) onCommit(text);
    else setText(value);
  };
  return (
    <Field label="Id" hint={problem ?? hint}>
      {(id) => (
        <input
          id={id}
          value={text}
          readOnly={readOnly}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="font-mono"
        />
      )}
    </Field>
  );
};

const NumberField = ({
  label,
  value,
  onChange,
  step = 0.001,
}: {
  label: string;
  value: number;
  onChange(v: number): void;
  step?: number;
}) => (
  <Field label={label}>
    {(id) => (
      <input
        id={id}
        type="number"
        step={step}
        min={0}
        max={1}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.round(v * 1000) / 1000);
        }}
      />
    )}
  </Field>
);

const omit = <T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> => {
  const { [key]: _, ...rest } = value;
  return rest;
};

// ── An object ─────────────────────────────────────────────────────────────────

export const ObjectForm = ({
  doc,
  object,
  items,
  flags,
  links,
  onChange,
  onSelect,
}: {
  doc: SceneData;
  object: SceneObject;
  items: Items;
  // The game's flags, raised or required anywhere, to pick from.
  flags: string[];
  // Where the game links this scene's exits (game.json).
  links: Record<string, string>;
  onChange: Change;
  onSelect(id: string): void;
}) => {
  const { scene, objects } = doc;
  const key = (field: string) => `object:${object.id}:${field}`;
  const update = (next: SceneObject, field: string) =>
    onChange(
      {
        ...doc,
        scene: { ...scene, objects: scene.objects.map((o) => (o.id === object.id ? next : o)) },
      },
      key(field),
    );
  const rename = (id: string) => {
    const boxes = Object.fromEntries(
      Object.entries(objects).map(([k, v]) => [k === object.id ? id : k, v]),
    );
    onChange({
      ...doc,
      scene: {
        ...scene,
        objects: scene.objects.map((o) => (o.id === object.id ? { ...o, id } : o)),
      },
      objects: boxes,
    });
    onSelect(id);
  };
  const actions = object.actions ?? [];
  const setActions = (next: ObjectAction[], field: string) =>
    update(next.length === 0 ? omit(object, "actions") : { ...object, actions: next }, field);
  const setAction = (i: number, action: ObjectAction, field: string) =>
    setActions(
      actions.map((a, j) => (j === i ? action : a)),
      `action:${i}:${field}`,
    );
  const box = objects[object.id];
  const searchable = actions.some((a) => a.search) || (object.contents ?? []).length > 0;
  const contents = object.contents ?? [];
  const exits = [...sceneExits(scene).keys()];

  return (
    <>
      <Section title="Object">
        <div className="flex flex-col gap-3">
          <IdField
            value={object.id}
            taken={scene.objects.map((o) => o.id).filter((id) => id !== object.id)}
            onCommit={rename}
          />
          <Field
            label="Label"
            hint={
              actions.length > 0 ? "Its name, for screen readers" : "Its only action, with its text"
            }
          >
            {(id) => (
              <input
                id={id}
                value={object.label}
                onChange={(e) => update({ ...object, label: e.target.value }, "label")}
              />
            )}
          </Field>
          {actions.length === 0 && (
            <Field label="Text">
              {(id) => (
                <TextArea
                  id={id}
                  value={object.text ?? ""}
                  onChange={(text) => update({ ...object, text }, "text")}
                  rows={3}
                />
              )}
            </Field>
          )}
          {box === undefined && (
            <p className="rounded border border-red-900 bg-red-950/40 px-2 py-1.5 text-xs text-red-200">
              No box: the apps leave it out. Draw one on the image.
            </p>
          )}
        </div>
      </Section>

      <Section
        title="Actions"
        actions={
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() =>
              setActions(
                actions.length === 0
                  ? [{ label: "Regarder", ...(object.text ? { text: object.text } : {}) }]
                  : [...actions, { label: "", text: "" }],
                "add",
              )
            }
          >
            + Add
          </Button>
        }
      >
        {actions.length === 0 && (
          <p className="text-xs text-zinc-500">None: its label and text are its only action.</p>
        )}
        <div className="flex flex-col gap-3">
          {actions.map((action, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded border border-zinc-800 bg-zinc-900/60 p-2"
            >
              <div className="flex gap-1">
                <input
                  value={action.label}
                  placeholder="Label (a verb)"
                  onChange={(e) => setAction(i, { ...action, label: e.target.value }, "label")}
                  className="min-w-0 flex-1"
                />
                <Button
                  variant="ghost"
                  className="px-1.5 text-xs"
                  disabled={i === 0}
                  title="Up"
                  onClick={() => {
                    const next = [...actions];
                    [next[i - 1], next[i]] = [next[i] as ObjectAction, next[i - 1] as ObjectAction];
                    setActions(next, "order");
                  }}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  className="px-1.5 text-xs"
                  title="Remove"
                  onClick={() =>
                    setActions(
                      actions.filter((_, j) => j !== i),
                      "remove",
                    )
                  }
                >
                  ✕
                </Button>
              </div>
              <TextArea
                value={action.text ?? ""}
                placeholder={
                  action.search
                    ? "Shown with what it holds (optional)"
                    : "What the player finds out"
                }
                onChange={(text) =>
                  setAction(i, text === "" ? omit(action, "text") : { ...action, text }, "text")
                }
              />
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <OptionalField
                  label="Exit"
                  value={action.exit}
                  list="exits"
                  onChange={(exit) =>
                    setAction(
                      i,
                      exit === undefined ? omit(action, "exit") : { ...action, exit },
                      "exit",
                    )
                  }
                />
                <OptionalField
                  label="Sets"
                  value={action.sets}
                  list="flags"
                  onChange={(sets) =>
                    setAction(
                      i,
                      sets === undefined ? omit(action, "sets") : { ...action, sets },
                      "sets",
                    )
                  }
                />
                <OptionalField
                  label="Requires"
                  value={action.requires}
                  list="flags"
                  onChange={(requires) =>
                    setAction(
                      i,
                      requires === undefined ? omit(action, "requires") : { ...action, requires },
                      "requires",
                    )
                  }
                />
              </div>
              {action.exit !== undefined && (
                <p className="text-xs text-zinc-500">
                  {links[action.exit] ? (
                    <>
                      Leads to <span className="text-emerald-300">{links[action.exit]}</span> (the
                      game&apos;s map)
                    </>
                  ) : (
                    "Not linked by the game: it stays closed and does what it would without exit."
                  )}
                </p>
              )}
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={action.search === true}
                  onChange={(e) =>
                    setAction(
                      i,
                      e.target.checked ? { ...action, search: true } : omit(action, "search"),
                      "search",
                    )
                  }
                />
                Search: shows what it holds
              </label>
            </div>
          ))}
        </div>
        <datalist id="exits">
          {exits.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
        <datalist id="flags">
          {flags.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </Section>

      {searchable && (
        <Section title={`Holds (${contents.length}/${CONTAINER_SLOTS.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {contents.map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 py-0.5 pr-1 pl-2 text-xs"
              >
                <span className={items[item] ? "" : "text-red-300"}>
                  {items[item]?.name ?? item}
                </span>
                <button
                  type="button"
                  className="rounded-full px-1 text-zinc-500 hover:text-white"
                  onClick={() => {
                    const next = contents.filter((_, j) => j !== i);
                    update(
                      next.length === 0 ? omit(object, "contents") : { ...object, contents: next },
                      "contents",
                    );
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
            {contents.length < CONTAINER_SLOTS.length && (
              <select
                value=""
                onChange={(e) =>
                  e.target.value &&
                  update({ ...object, contents: [...contents, e.target.value] }, "contents")
                }
                className="py-0 text-xs"
              >
                <option value="">+ item</option>
                {Object.entries(items).map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {Object.keys(items).length === 0 && (
            <p className="mt-1 text-xs text-zinc-500">The game lists no item (items/index.ts).</p>
          )}
        </Section>
      )}

      <Section title="Box">
        {box ? (
          <div className="grid grid-cols-4 gap-1.5">
            {(["x0", "y0", "x1", "y1"] as const).map((k) => (
              <NumberField
                key={k}
                label={k}
                value={box[k]}
                onChange={(v) =>
                  onChange(
                    { ...doc, objects: { ...objects, [object.id]: { ...box, [k]: v } } },
                    key(`box:${k}`),
                  )
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Draw it on the image.</p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          The dashed blue box is its zone, where the generator was asked to paint it.{" "}
          {box && (
            <button
              type="button"
              className="underline hover:text-zinc-200"
              onClick={() => update({ ...object, zone: box }, "zone")}
            >
              Set the zone to the box
            </button>
          )}
        </p>
      </Section>

      <Section title="For the generator">
        <div className="flex flex-col gap-3">
          <Field label="Paint" hint="What is painted, in French">
            {(id) => (
              <TextArea
                id={id}
                value={object.paint}
                onChange={(paint) => update({ ...object, paint }, "paint")}
              />
            )}
          </Field>
          <Field label="Detect" hint="How to find it in the image, in English">
            {(id) => (
              <TextArea
                id={id}
                value={object.detect}
                onChange={(detect) => update({ ...object, detect }, "detect")}
              />
            )}
          </Field>
        </div>
      </Section>
    </>
  );
};

// A field that may be left out: empty, it is not there.
const OptionalField = ({
  label,
  value,
  list,
  onChange,
}: {
  label: string;
  value: string | undefined;
  list: string;
  onChange(value: string | undefined): void;
}) => (
  <Field label={label}>
    {(id) => (
      <input
        id={id}
        list={list}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.trim() === "" ? undefined : e.target.value)}
        className="w-full font-mono text-xs"
      />
    )}
  </Field>
);

// ── A character ───────────────────────────────────────────────────────────────

export const CharacterForm = ({
  doc,
  character,
  hasLayer,
  onChange,
  onSelect,
  onUpload,
}: {
  doc: SceneData;
  character: Character;
  hasLayer: boolean;
  onChange: Change;
  onSelect(id: string): void;
  onUpload(file: File): void;
}) => {
  const { scene, aspects } = doc;
  const update = (next: Character, field: string) =>
    onChange(
      {
        ...doc,
        scene: {
          ...scene,
          characters: scene.characters.map((c) => (c.id === character.id ? next : c)),
        },
      },
      `character:${character.id}:${field}`,
    );
  const { dialogue } = character;
  const setDialogue = (next: Character["dialogue"], field: string) =>
    update({ ...character, dialogue: next }, `dialogue:${field}`);
  return (
    <>
      <Section title="Character">
        <div className="flex flex-col gap-3">
          <IdField
            value={character.id}
            taken={scene.characters.map((c) => c.id).filter((id) => id !== character.id)}
            readOnly={hasLayer}
            hint={hasLayer ? "Its layer is named after it: it keeps its id" : undefined}
            onCommit={(id) => {
              const { [character.id]: aspect, ...rest } = aspects;
              onChange({
                ...doc,
                scene: {
                  ...scene,
                  characters: scene.characters.map((c) =>
                    c.id === character.id ? { ...c, id } : c,
                  ),
                },
                aspects: aspect === undefined ? rest : { ...rest, [id]: aspect },
              });
              onSelect(id);
            }}
          />
          <Field label="Name">
            {(id) => (
              <input
                id={id}
                value={character.name}
                onChange={(e) => update({ ...character, name: e.target.value }, "name")}
              />
            )}
          </Field>
          <div className="grid grid-cols-3 gap-1.5">
            <NumberField
              label="Feet x"
              value={character.anchor.x}
              onChange={(x) => update({ ...character, anchor: { ...character.anchor, x } }, "x")}
            />
            <NumberField
              label="Feet y"
              value={character.anchor.y}
              onChange={(y) => update({ ...character, anchor: { ...character.anchor, y } }, "y")}
            />
            <NumberField
              label="Height"
              value={character.height}
              onChange={(height) => update({ ...character, height }, "height")}
            />
          </div>
          <Field
            label="Layer"
            hint={
              hasLayer
                ? `${character.id}.webp, ${aspects[character.id] ?? "?"} wide per 1 high`
                : `No ${character.id}.webp yet: the apps do not list the scene until it has one. Upload an image with transparency (PNG).`
            }
          >
            {(id) => (
              <input
                id={id}
                type="file"
                accept="image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = "";
                }}
                className="text-xs file:mr-2 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-zinc-100"
              />
            )}
          </Field>
          <Field label="Paint" hint="What its layer shows, in French">
            {(id) => (
              <TextArea
                id={id}
                value={character.paint}
                onChange={(paint) => update({ ...character, paint }, "paint")}
              />
            )}
          </Field>
        </div>
      </Section>
      <Section title="Dialogue">
        <div className="flex flex-col gap-3">
          <Field label="Greeting">
            {(id) => (
              <TextArea
                id={id}
                value={dialogue.greeting}
                onChange={(greeting) => setDialogue({ ...dialogue, greeting }, "greeting")}
              />
            )}
          </Field>
          {dialogue.topics.map((topic, i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 rounded border border-zinc-800 bg-zinc-900/60 p-2"
            >
              <div className="flex gap-1">
                <input
                  value={topic.ask}
                  placeholder="What the player asks"
                  onChange={(e) =>
                    setDialogue(
                      {
                        ...dialogue,
                        topics: dialogue.topics.map((t, j) =>
                          j === i ? { ...t, ask: e.target.value } : t,
                        ),
                      },
                      `topic:${i}:ask`,
                    )
                  }
                  className="min-w-0 flex-1"
                />
                <Button
                  variant="ghost"
                  className="px-1.5 text-xs"
                  onClick={() =>
                    setDialogue(
                      { ...dialogue, topics: dialogue.topics.filter((_, j) => j !== i) },
                      "remove",
                    )
                  }
                >
                  ✕
                </Button>
              </div>
              <TextArea
                value={topic.answer}
                placeholder="The answer"
                onChange={(answer) =>
                  setDialogue(
                    {
                      ...dialogue,
                      topics: dialogue.topics.map((t, j) => (j === i ? { ...t, answer } : t)),
                    },
                    `topic:${i}:answer`,
                  )
                }
              />
            </div>
          ))}
          <div>
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() =>
                setDialogue(
                  { ...dialogue, topics: [...dialogue.topics, { ask: "", answer: "" }] },
                  "add",
                )
              }
            >
              + Topic
            </Button>
          </div>
          <Field label="Farewell">
            {(id) => (
              <TextArea
                id={id}
                value={dialogue.farewell}
                onChange={(farewell) => setDialogue({ ...dialogue, farewell }, "farewell")}
              />
            )}
          </Field>
        </div>
      </Section>
    </>
  );
};

// ── The scene ─────────────────────────────────────────────────────────────────

export const SceneForm = ({ doc, onChange }: { doc: SceneData; onChange: Change }) => {
  const { scene } = doc;
  const update = (next: typeof scene, field: string) =>
    onChange({ ...doc, scene: next }, `scene:${field}`);
  // The exits the back button can take: those of the scene's actions.
  const exits = [
    ...new Set(
      scene.objects.flatMap((o) => (o.actions ?? []).flatMap((a) => (a.exit ? [a.exit] : []))),
    ),
  ];
  return (
    <>
      <Section title="Scene">
        <div className="flex flex-col gap-3">
          <Field label="Title">
            {(id) => (
              <input
                id={id}
                value={scene.title}
                onChange={(e) => update({ ...scene, title: e.target.value }, "title")}
              />
            )}
          </Field>
          <Field label="Intro" hint="Shown on its opening, and kept in the logbook">
            {(id) => (
              <TextArea
                id={id}
                value={scene.intro}
                onChange={(intro) => update({ ...scene, intro }, "intro")}
                rows={3}
              />
            )}
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={scene.opening !== false}
              onChange={(e) =>
                update(
                  e.target.checked ? omit(scene, "opening") : { ...scene, opening: false },
                  "opening",
                )
              }
            />
            Opens on its title and intro, on black
          </label>
          <Field
            label="Back button"
            hint="An exit, taken by the return arrow where the game links it"
          >
            {(id) => (
              <select
                id={id}
                value={scene.back ?? ""}
                onChange={(e) =>
                  update(
                    e.target.value === ""
                      ? omit(scene, "back")
                      : { ...scene, back: e.target.value },
                    "back",
                  )
                }
              >
                <option value="">none</option>
                {scene.back !== undefined && !exits.includes(scene.back) && (
                  <option value={scene.back}>{scene.back}</option>
                )}
                {exits.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            )}
          </Field>
          <p className="text-xs text-zinc-500">
            {scene.imageRatio === "16:9" ? "Landscape 16:9" : "Portrait 9:16"}
            {scene.night ? " · has its night" : " · no night yet"}
            {(scene.effects ?? []).length > 0 &&
              ` · animations: ${(scene.effects ?? []).map((e) => `${e.id} (${e.kind})`).join(", ")}`}
          </p>
        </div>
      </Section>
      <Section title="Generated from">
        <div className="flex flex-col gap-3">
          <Field label="Brief" hint="What Repaint starts from">
            {(id) => (
              <TextArea
                id={id}
                value={scene.brief ?? ""}
                onChange={(brief) => update({ ...scene, brief }, "brief")}
              />
            )}
          </Field>
          <Field label="Light" hint="For the characters' layers to match the background">
            {(id) => (
              <TextArea
                id={id}
                value={scene.light}
                onChange={(light) => update({ ...scene, light }, "light")}
              />
            )}
          </Field>
          <Field label="Style">
            {(id) => <TextArea id={id} value={scene.style} readOnly onChange={() => {}} />}
          </Field>
          <Field label="Decor">
            {(id) => (
              <TextArea id={id} value={scene.background.prompt} readOnly onChange={() => {}} />
            )}
          </Field>
          {scene.night && (
            <Field label="Night">
              {(id) => (
                <TextArea
                  id={id}
                  value={`${scene.night?.light}\n\n${scene.night?.prompt}`}
                  readOnly
                  onChange={() => {}}
                />
              )}
            </Field>
          )}
        </div>
      </Section>
    </>
  );
};
