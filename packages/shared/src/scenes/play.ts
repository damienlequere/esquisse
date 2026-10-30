import { itemAdded } from "./items.ts";
import type { Character, ObjectAction, SceneData, SceneObject, Topic } from "./types.ts";

// What a scene shows as it is played, the same in both apps: the narration
// band, the open conversation if any, what the player carries, and what an
// object being searched holds, and the last toast. The apps only draw it, and turn their
// own inputs (Escape, Android's back button…) into actions.

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
  contents: Object.fromEntries(
    scene.objects.flatMap(({ id, contents }) =>
      contents ? [[id, contents.slice(0, CONTAINER_SLOTS.length)]] : [],
    ),
  ),
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
        toast: { text: itemAdded(action.item), key: (state.toast?.key ?? 0) + 1 },
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
// it, clockwise; the one under the finger when it is let go is chosen. Its first
// item is the inventory's satchel, then these, to come. The same in px on both
// apps: the circle's and an item's diameters, the least distance from the
// circle's center to an item's, the least room between two items, and how far
// from its center an item is still under the finger.
export const RING_ITEMS = ["1", "2", "3"];
export const RING = { size: 56, item: 44, radius: 88, space: 16, hit: 32 };

// The angle between two items, and the distance from the circle's center to
// theirs: further with more items, to keep RING.space between them.
const ringStep = (count: number) => (count > 1 ? Math.PI / 2 / (count - 1) : 0);
const ringRadius = (count: number) =>
  count > 1
    ? Math.max(RING.radius, (RING.item + RING.space) / (2 * Math.sin(ringStep(count) / 2)))
    : RING.radius;

// Where an item's center is, in px from the circle's center (y down).
export const ringItemOffset = (index: number, count: number) => {
  const angle = Math.PI - (count > 1 ? index * ringStep(count) : Math.PI / 4);
  const radius = ringRadius(count);
  return { x: Math.cos(angle) * radius, y: -Math.sin(angle) * radius };
};

// The item under a point, in px from the circle's center, if any. Two
// neighbours' never meet.
export const ringItemAt = (point: { x: number; y: number }, count: number) => {
  const hit =
    count > 1 ? Math.min(RING.hit, ringRadius(count) * Math.sin(ringStep(count) / 2)) : RING.hit;
  for (let i = 0; i < count; i++) {
    const { x, y } = ringItemOffset(i, count);
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
  // The ring menu's satchel, and the window it opens.
  inventory: "Inventaire",
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
