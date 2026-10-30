// What the player can carry, by id: what an object holds (contents in
// scene.json) and what the inventory shows. Each one's image is
// assets/items/<id>.webp, painted on green and keyed out like a character
// (packages/generator/sources/items/<id>.jpg), listed by each app.

// feminine: its name takes the feminine (« Pelle ajoutée »).
export type Item = { name: string; feminine?: boolean };

export const ITEMS: Record<string, Item> = {
  pelle: { name: "Pelle", feminine: true },
  lanterne: { name: "Lanterne", feminine: true },
  couteau: { name: "Couteau" },
};

// An item's name, or its id if it is not listed.
export const itemName = (id: string) => ITEMS[id]?.name ?? id;

// What a toast says when an item is taken.
export const itemAdded = (id: string) =>
  `${itemName(id)} ${ITEMS[id]?.feminine ? "ajoutée" : "ajouté"} à l'inventaire`;
