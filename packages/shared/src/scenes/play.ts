import type { Character, SceneData, Topic } from "./types.ts";

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

// How long the ✦ button shows what is clickable.
export const REVEAL_MS = 1600;

export const sceneText = {
  talkTo: (name: string) => `Parler à ${name}`,
  goodbye: "Au revoir.",
  reveal: "Révéler ce qui est cliquable",
  // When the screen is not turned like the scene.
  turnLandscape: "Tourne ton écran à l'horizontale",
  turnPortrait: "Tourne ton écran à la verticale",
};
