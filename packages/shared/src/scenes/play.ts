import type { Character, Scene, SceneData, Topic } from "./types.ts";

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
// (textFade); once it has been held long enough to be read, footprints to enter
// show under it, one step after another (each fading in for stepFade, stepDelay
// after the one before). The scene waits for them: pressed, everything fades out
// (fade) to show the scene. Each app draws it.
export const INTRO = { textDelay: 1000, textFade: 1500, stepDelay: 300, stepFade: 400, fade: 1200 };

// The footprints which enter the scene, in a viewBox of width × height: steps
// walking up and to the right, a left foot and a right one in turn, on a ground
// seen in perspective: it is squashed upward (tilt), and each step, farther than
// the one before, is smaller (scale). Each is a shoe's print, its sole and its
// heel, drawn as a right shoe pointing up, around (0, 0); a left one is that
// mirrored.
export const FOOTPRINTS = {
  width: 60,
  height: 56,
  // The way they walk on the ground, in degrees from straight ahead.
  heading: 30,
  tilt: 0.62,
  sole: "M0.6,-12 C4,-12 5.4,-8 5.2,-4 C5,-1 4,1.5 3.4,3.4 L-2.4,3.4 C-2.8,1 -4.2,-2 -4.2,-5.2 C-4.2,-9.2 -2.6,-12 0.6,-12 Z",
  heel: "M-2.7,5.4 L3.3,5.4 C3.7,8.2 3.5,12 0.3,12 C-2.9,12 -3.1,8.2 -2.7,5.4 Z",
  steps: [
    { x: 10, y: 47, scale: 1, left: true },
    { x: 30.4, y: 36.3, scale: 0.8, left: false },
    { x: 34.2, y: 23.2, scale: 0.64, left: true },
    { x: 47.3, y: 16.4, scale: 0.51, left: false },
    { x: 49.8, y: 8, scale: 0.41, left: true },
  ],
};

// A step's SVG transform: the shoe mirrored if left, turned the way they walk,
// laid on the ground, then placed.
export const footprintTransform = ({ x, y, scale, left }: (typeof FOOTPRINTS.steps)[number]) =>
  `translate(${x} ${y}) scale(${scale} ${scale * FOOTPRINTS.tilt}) rotate(${FOOTPRINTS.heading}) scale(${left ? -1 : 1} 1)`;

const READING_MS_PER_CHAR = 35;

// From the opening to the button to enter.
export const introHold = (scene: Scene) =>
  INTRO.textDelay + INTRO.textFade + Math.max(1500, scene.intro.length * READING_MS_PER_CHAR);

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

// The topics not asked yet in a conversation.
export const remainingTopics = ({ character, asked }: Conversation) =>
  character.dialogue.topics.filter((topic) => !asked.includes(topic.ask));

export const sceneText = {
  // The footprints which end the scene's opening, for screen readers.
  enter: "Entrer",
  talkTo: (name: string) => `Parler à ${name}`,
  goodbye: "Au revoir.",
  // The text panel, in landscape.
  foldText: "Replier le texte",
  unfoldText: "Afficher le texte",
  // When the screen is not turned like the scene.
  turnLandscape: "Tourne ton écran à l'horizontale",
  turnPortrait: "Tourne ton écran à la verticale",
};
