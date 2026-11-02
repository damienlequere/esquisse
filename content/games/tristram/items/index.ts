import type { Items } from "@esquisse/engine";

// What the player can carry in this game, by id: what an object holds
// (contents in scene.json) and what the inventory shows. Each one's image is
// items/<id>.webp, painted on green and keyed out like a character
// (items/sources/<id>.jpg), listed by each app.
export const ITEMS: Items = {
  pelle: { name: "Pelle", feminine: true },
  lanterne: { name: "Lanterne", feminine: true },
  couteau: { name: "Couteau" },
};
