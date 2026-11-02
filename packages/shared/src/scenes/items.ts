// What the player can carry, by id, as a game's content lists it
// (@esquisse/content's ITEMS): what an object holds (contents in scene.json)
// and what the inventory shows.

// feminine: its name takes the feminine (« Pelle ajoutée »).
export type Item = { name: string; feminine?: boolean };
export type Items = Record<string, Item>;

// An item's name, or its id if it is not listed.
export const itemName = (items: Items, id: string) => items[id]?.name ?? id;

// What a toast says when an item is taken.
export const itemAdded = (items: Items, id: string) =>
  `${itemName(items, id)} ${items[id]?.feminine ? "ajoutée" : "ajouté"} à l'inventaire`;
