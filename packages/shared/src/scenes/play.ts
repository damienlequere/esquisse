import type { Character, ObjectAction, SceneData, SceneObject, Topic } from "./types.ts";

// What a scene shows as it is played, the same in both apps: the narration
// band, and the open conversation if any. The apps only draw it, and turn their
// own inputs (Escape, Android's back button…) into actions.

export type Line = { text: string; player?: boolean };
export type Conversation = { character: Character; lines: Line[]; asked: string[] };

export type SceneState = {
  // key changes with each narration, so the band plays its entrance again.
  narration: { title: string; text: string; key: number };
  conversation?: Conversation;
};

export type SceneAction =
  | { type: "look"; title: string; text: string }
  | { type: "talk"; character: Character }
  | { type: "ask"; topic: Topic }
  | { type: "leave" };

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

// The arrow which enters the scene, pointing right: a stroke in a 24 × 24 viewBox.
export const ENTER_ARROW = "M4,12 H20 M13,5 L20,12 L13,19";

// From the opening to the button to enter.
export const INTRO_HOLD = INTRO.textDelay + INTRO.textFade + INTRO.buttonDelay;

export const initialSceneState = ({ scene }: SceneData): SceneState => ({
  narration: { title: scene.title, text: scene.intro, key: 0 },
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
      return { narration: narrate(state, c.character.name, c.character.dialogue.farewell) };
  }
};

// The actions an object's menu offers: its own, or its label and its text.
export const objectActions = (object: SceneObject): ObjectAction[] =>
  object.actions ?? [{ label: object.label, text: object.text ?? "" }];

// Where an object's menu goes, in px from the frame's top left corner: to the
// right of the point where the object was clicked, or to its left if there is
// not room enough, centered on it vertically, always inside the frame.
const MENU_GAP = 16;
export const objectMenuPlace = (
  point: { x: number; y: number },
  menu: { width: number; height: number },
  frame: { width: number; height: number },
) => {
  const clamp = (v: number, own: number, room: number) =>
    Math.min(Math.max(MENU_GAP, v), Math.max(MENU_GAP, room - own - MENU_GAP));
  const right = point.x + MENU_GAP;
  const left =
    right + menu.width + MENU_GAP <= frame.width ? right : point.x - MENU_GAP - menu.width;
  return {
    left: clamp(left, menu.width, frame.width),
    top: clamp(point.y - menu.height / 2, menu.height, frame.height),
  };
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
  // The text panel, in landscape.
  foldText: "Replier le texte",
  unfoldText: "Afficher le texte",
  // When the screen is not turned like the scene.
  turnLandscape: "Tourner l'écran à l'horizontale",
  turnPortrait: "Tourner l'écran à la verticale",
};
