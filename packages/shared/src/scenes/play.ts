import { itemAdded } from "./items.ts";
import type { Character, ObjectAction, SceneData, SceneObject, Topic } from "./types.ts";

// What a scene shows as it is played, the same in both apps: the narration
// band, the open conversation if any, what the player carries, and what an
// object being searched holds, and the last toast. The apps only draw it, and turn their
// own inputs (Escape, Android's back button…) into actions. The logbook
// starts with the scene's intro.

export type Line = { text: string; player?: boolean };
export type Conversation = { character: Character; lines: Line[]; asked: string[] };

export type SceneState = {
  // key changes with each narration, so the band plays its entrance again.
  narration: { title: string; text: string; key: number };
  conversation?: Conversation;
  // The items carried, in the order taken, one per inventory slot.
  inventory: string[];
  // What each object still holds, by its id.
  contents: Record<string, string[]>;
  // The object whose contents are shown, if any.
  searching?: SceneObject;
  // What the last toast says; key changes with each one, so it shows again.
  toast?: { text: string; key: number };
  // The logbook's entries, oldest first.
  logbook: string[];
};

export type SceneAction =
  | { type: "look"; title: string; text: string }
  | { type: "talk"; character: Character }
  | { type: "ask"; topic: Topic }
  | { type: "leave" }
  | { type: "search"; object: SceneObject }
  | { type: "take"; item: string }
  | { type: "stopSearching" };

// Opening a scene, in ms: its title alone, then its intro fading in under it
// (textFade); shortly after it has fully appeared (buttonDelay), whatever its
// length, an arrow to enter fades in, in the bottom right corner of the frame
// (buttonFade). The scene waits for it: pressed, everything fades out (fade) to
// show the scene. Each app draws it.
export const INTRO = {
  textDelay: 1000,
  textFade: 1500,
  buttonDelay: 500,
  buttonFade: 800,
  fade: 1200,
};

// A toast, in ms: it slides in at the bottom of the frame, stays, and fades out,
// all in duration; fade is its entrance and its exit. Each app draws it.
export const TOAST = { duration: 2500, fade: 250 };

// The arrow which enters the scene, pointing right: a stroke in a 24 × 24 viewBox.
export const ENTER_ARROW = "M4,12 H20 M13,5 L20,12 L13,19";

// From the opening to the button to enter.
export const INTRO_HOLD = INTRO.textDelay + INTRO.textFade + INTRO.buttonDelay;

export const initialSceneState = ({ scene }: SceneData): SceneState => ({
  narration: { title: scene.title, text: scene.intro, key: 0 },
  inventory: [],
  logbook: [scene.intro],
  contents: Object.fromEntries(
    scene.objects.flatMap(({ id, contents }) =>
      contents ? [[id, contents.slice(0, CONTAINER_SLOTS.length)]] : [],
    ),
  ),
});

const toastOf = (state: SceneState, text: string) => ({
  text,
  key: (state.toast?.key ?? 0) + 1,
});

const narrate = (state: SceneState, title: string, text: string) => ({
  title,
  text,
  key: state.narration.key + 1,
});

export const playScene = (state: SceneState, action: SceneAction): SceneState => {
  const c = state.conversation;
  switch (action.type) {
    case "look":
      return { ...state, narration: narrate(state, action.title, action.text) };
    case "talk": {
      const { character } = action;
      return {
        ...state,
        conversation: { character, lines: [{ text: character.dialogue.greeting }], asked: [] },
      };
    }
    case "ask": {
      if (c === undefined) return state;
      const { ask, answer } = action.topic;
      return {
        ...state,
        conversation: {
          ...c,
          lines: [...c.lines, { text: `— ${ask}`, player: true }, { text: answer }],
          asked: [...c.asked, ask],
        },
      };
    }
    case "leave":
      // The character's farewell stays in the narration band.
      if (c === undefined) return state;
      return {
        ...state,
        conversation: undefined,
        narration: narrate(state, c.character.name, c.character.dialogue.farewell),
      };
    case "search":
      return { ...state, searching: action.object };
    case "take": {
      // From the object searched, while the inventory has room.
      const object = state.searching;
      const held = object && state.contents[object.id];
      const at = held?.indexOf(action.item) ?? -1;
      if (object === undefined || held === undefined || at < 0) return state;
      if (state.inventory.length >= INVENTORY_SLOTS.length) return state;
      return {
        ...state,
        inventory: [...state.inventory, action.item],
        contents: { ...state.contents, [object.id]: held.filter((_, i) => i !== at) },
        toast: toastOf(state, itemAdded(action.item)),
      };
    }
    case "stopSearching":
      return { ...state, searching: undefined };
  }
};

// What an object's action does: shows what it holds, or tells its text.
export const objectAction = (object: SceneObject, action: ObjectAction): SceneAction =>
  action.search
    ? { type: "search", object }
    : { type: "look", title: action.label, text: action.text ?? "" };

// The actions an object's menu offers: its own, or its label and its text.
export const objectActions = (object: SceneObject): ObjectAction[] =>
  object.actions ?? [{ label: object.label, text: object.text ?? "" }];

// Where an object's menu goes, in px from the frame's top left corner: to the
// right of the point where the object was clicked, or to its left if there is
// not room enough, centered on it vertically, always inside the frame. The
// same in px on both apps: from the point (GAP), and from the frame's edges
// (EDGE).
const MENU_GAP = 32;
const MENU_EDGE = 16;
export const objectMenuPlace = (
  point: { x: number; y: number },
  menu: { width: number; height: number },
  frame: { width: number; height: number },
) => {
  const clamp = (v: number, own: number, room: number) =>
    Math.min(Math.max(MENU_EDGE, v), Math.max(MENU_EDGE, room - own - MENU_EDGE));
  const right = point.x + MENU_GAP;
  const left =
    right + menu.width + MENU_EDGE <= frame.width ? right : point.x - MENU_GAP - menu.width;
  return {
    left: clamp(left, menu.width, frame.width),
    top: clamp(point.y - menu.height / 2, menu.height, frame.height),
  };
};

// The inventory's slots, by number, the same in both apps: three rows of four,
// in a window in the middle of the screen. The items carried fill them in the
// order taken.
export const INVENTORY_SLOTS = Array.from({ length: 12 }, (_, i) => i + 1);
export const INVENTORY_COLUMNS = 4;

// What an object holds, shown when it is searched: three rows of three slots,
// in a window like the inventory's, the same in both apps. An item pressed goes
// to the inventory.
export const CONTAINER_SLOTS = Array.from({ length: 9 }, (_, i) => i + 1);
export const CONTAINER_COLUMNS = 3;

// The ring menu, in the bottom right corner of a scene: a circle which, held,
// spreads its items in a quarter of a circle around it, from its left to above
// it, clockwise; the one under the finger when it is let go is chosen: the
// inventory's pouch, the logbook's journal, then the
// cogwheel of the general menu. The same on both apps, in px on a phone: the
// circle's and an item's diameters, the least distance from the circle's
// center to an item's, the least room between two items, and how far from its
// center an item is still under the finger.
export const RING = { size: 72, item: 56, radius: 100, space: 16, hit: 36 };

export type Ring = typeof RING;

// The ring menu follows the screen: RING on a phone (its shorter side about
// 400 px), larger on a tablet or a computer, smaller on a small phone, within
// these bounds.
const RING_REFERENCE = 400;
const RING_SCALE = { min: 0.85, max: 1.2 };

// The ring menu's sizes, in px, on a screen of this width and height.
export const ringSizes = (width: number, height: number): Ring => {
  const scale = Math.min(
    RING_SCALE.max,
    Math.max(RING_SCALE.min, Math.min(width, height) / RING_REFERENCE),
  );
  return {
    size: Math.round(RING.size * scale),
    item: Math.round(RING.item * scale),
    radius: Math.round(RING.radius * scale),
    space: Math.round(RING.space * scale),
    hit: Math.round(RING.hit * scale),
  };
};

// The ring menu's circle, and its items, drawn as the arrow to enter is: a
// stroke in a 24 × 24 viewBox. A circle with a smaller one in it; a leather
// pouch, its neck tied by a cord whose two ends hang over it;
// a bound journal, its cover and three rings on its left, four lines of text
// on it (Bootstrap Icons' journal-text, MIT, its shapes drawn as strokes);
// a cogwheel.
export const RING_BUTTON =
  "M21,12 A9,9 0 1 1 3,12 A9,9 0 1 1 21,12 M15,12 A3,3 0 1 1 9,12 A3,3 0 1 1 15,12";
export const RING_ICONS = {
  inventory:
    "M10,9 C6,10.5 4.5,14 5,17.5 C5.5,20.3 8.5,21 12,21 C15.5,21 18.5,20.3 19,17.5 C19.5,14 18,10.5 14,9 M9.5,9 H14.5 M10,9 C9.6,7.5 8.8,6 8,4.8 C9.5,5 10.8,4.7 12,3.8 C13.2,4.7 14.5,5 16,4.8 C15.2,6 14.4,7.5 14,9 M13,9 C13.8,10.5 14.2,12 13.8,14 M13,9 C14.8,10 16,11.3 16.3,13",
  logbook:
    "M3.875,5.125 V4.5 A1.875,1.875 0 0 1 5.75,2.625 H18.25 A1.875,1.875 0 0 1 20.125,4.5 V19.5 A1.875,1.875 0 0 1 18.25,21.375 H5.75 A1.875,1.875 0 0 1 3.875,19.5 V18.875 M2.625,8.875 H5.125 M3.875,7.625 V8.875 M2.625,12.625 H5.125 M3.875,11.375 V12.625 M2.625,16.375 H5.125 M3.875,15.125 V16.375 M8.875,7.625 H15.125 M8.875,10.125 H15.125 M8.875,12.625 H15.125 M8.875,15.125 H11.375",
  gameMenu:
    "M10.31,5.21 L10.44,2.63 L13.56,2.63 L13.69,5.21 L15.61,6 L17.52,4.27 L19.73,6.48 L18,8.39 L18.79,10.31 L21.37,10.44 L21.37,13.56 L18.79,13.69 L18,15.61 L19.73,17.52 L17.52,19.73 L15.61,18 L13.69,18.79 L13.56,21.37 L10.44,21.37 L10.31,18.79 L8.39,18 L6.48,19.73 L4.27,17.52 L6,15.61 L5.21,13.69 L2.63,13.56 L2.63,10.44 L5.21,10.31 L6,8.39 L4.27,6.48 L6.48,4.27 L8.39,6 Z M15,12 A3,3 0 1 1 9,12 A3,3 0 1 1 15,12",
};

// The angle between two items, and the distance from the circle's center to
// theirs: further with more items, to keep ring.space between them.
const ringStep = (count: number) => (count > 1 ? Math.PI / 2 / (count - 1) : 0);
const ringRadius = (count: number, ring: Ring) =>
  count > 1
    ? Math.max(ring.radius, (ring.item + ring.space) / (2 * Math.sin(ringStep(count) / 2)))
    : ring.radius;

// Where an item's center is, in px from the circle's center (y down), with the
// ring menu's sizes (ringSizes).
export const ringItemOffset = (index: number, count: number, ring: Ring) => {
  const angle = Math.PI - (count > 1 ? index * ringStep(count) : Math.PI / 4);
  const radius = ringRadius(count, ring);
  return { x: Math.cos(angle) * radius, y: -Math.sin(angle) * radius };
};

// The item under a point, in px from the circle's center, if any. Two
// neighbours' never meet.
export const ringItemAt = (point: { x: number; y: number }, count: number, ring: Ring) => {
  const hit =
    count > 1
      ? Math.min(ring.hit, ringRadius(count, ring) * Math.sin(ringStep(count) / 2))
      : ring.hit;
  for (let i = 0; i < count; i++) {
    const { x, y } = ringItemOffset(i, count, ring);
    if (Math.hypot(point.x - x, point.y - y) <= hit) return i;
  }
  return undefined;
};

// The topics not asked yet in a conversation.
export const remainingTopics = ({ character, asked }: Conversation) =>
  character.dialogue.topics.filter((topic) => !asked.includes(topic.ask));

export const sceneText = {
  // The arrow which ends the scene's opening, for screen readers.
  enter: "Entrer",
  talkTo: (name: string) => `Parler à ${name}`,
  goodbye: "Au revoir.",
  // An object's menu of actions, for screen readers.
  actionsOf: (name: string) => `Actions : ${name}`,
  // The ring menu's backpack, and the window it opens.
  inventory: "Inventaire",
  // The ring menu's logbook, and the window it opens.
  logbook: "Journal de bord",
  // The ring menu's cogwheel, and the window it opens: save the game (to come),
  // or leave the scene for the home screen.
  gameMenu: "Menu général",
  save: "Sauvegarder la partie",
  quit: "Quitter",
  emptySlot: "Emplacement vide",
  // An item in what an object holds, which goes to the inventory when pressed.
  take: (name: string) => `Prendre : ${name}`,
  close: "Fermer",
  // The ring menu's circle, for screen readers.
  ringMenu: "Menu",
  // When the screen is not turned like the scene.
  turnLandscape: "Tourner l'écran à l'horizontale",
  turnPortrait: "Tourner l'écran à la verticale",
};
