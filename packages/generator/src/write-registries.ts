// Writes the lists of the games for both apps (see registry.ts), from what is
// on disk, as each command does after it saves: for the studio (apps/studio),
// after it saves a scene.
//
//   node --experimental-strip-types src/write-registries.ts

import { writeRegistries } from "./registry.ts";

writeRegistries();
