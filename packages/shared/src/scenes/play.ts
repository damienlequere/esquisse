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
// (textFade); once it has been held long enough to be read, an arrow to enter
// fades in, in the bottom right corner of the frame (buttonFade). The scene
// waits for it: pressed, everything fades out (fade) to show the scene. Each app
// draws it.
export const INTRO = { textDelay: 1000, textFade: 1500, buttonFade: 800, fade: 1200 };

// The arrow which enters the scene, pointing right: a stroke in a 24 × 24 viewBox.
export const ENTER_ARROW = "M4,12 H20 M13,5 L20,12 L13,19";

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
  // The arrow which ends the scene's opening, for screen readers.
  enter: "Entrer",
  talkTo: (name: string) => `Parler à ${name}`,
  goodbye: "Au revoir.",
  // The text panel, in landscape.
  foldText: "Replier le texte",
  unfoldText: "Afficher le texte",
  // When the screen is not turned like the scene.
  turnLandscape: "Tourner l'écran à l'horizontale",
  turnPortrait: "Tourner l'écran à la verticale",
};
