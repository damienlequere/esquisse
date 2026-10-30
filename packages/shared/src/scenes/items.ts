// What the player can carry, by id: what an object holds (contents in
// scene.json) and what the inventory shows. Each one's image is
// assets/items/<id>.webp, painted on green and keyed out like the satchel
// (packages/generator/sources/items/<id>.jpg), listed by each app.

export type Item = { name: string };

export const ITEMS: Record<string, Item> = {
  pelle: { name: "Pelle" },
};

// An item's name, or its id if it is not listed.
export const itemName = (id: string) => ITEMS[id]?.name ?? id;
