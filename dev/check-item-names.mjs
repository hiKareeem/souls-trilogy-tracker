// DEV ONLY. Checks that every item name in games.js exists in a live server's data package,
// so an apworld update that renames an item is caught before a chip silently never lights.
//
//   node dev/check-item-names.mjs <server>      e.g. ws://localhost:38281
//
// The room must contain all three games. Read-only: it never authenticates to a slot.
// Needs Node 22+ (built-in WebSocket).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const server = process.argv[2];
if (!server) {
    console.error("usage: node dev/check-item-names.mjs <server>");
    process.exit(2);
}

const source = readFileSync(fileURLToPath(new URL("../games.js", import.meta.url)), "utf8");
const games = vm.runInNewContext(`${source}\nTRILOGY_GAMES;`);

const packages = await new Promise((resolve, reject) => {
    const socket = new WebSocket(server);
    socket.onerror = () => reject(new Error(`could not reach ${server}`));
    socket.onmessage = (event) => {
        for (const packet of JSON.parse(event.data)) {
            if (packet.cmd === "RoomInfo") {
                socket.send(JSON.stringify([{ cmd: "GetDataPackage", games: games.map((g) => g.game) }]));
            } else if (packet.cmd === "DataPackage") {
                socket.close();
                resolve(packet.data.games);
            }
        }
    };
});

let problems = 0;
for (const def of games) {
    const pkg = packages[def.game];
    if (!pkg) {
        console.error(`${def.game}: not in this room's data package`);
        problems += 1;
        continue;
    }
    const names = new Set(Object.keys(pkg.item_name_to_id));
    const wanted = [...def.milestones, ...def.keys, ...def.counters].flatMap((c) => c.items || [c.item]);
    const missing = wanted.filter((name) => !names.has(name));
    for (const name of missing) console.error(`${def.game}: no item named "${name}"`);
    console.log(`${def.game}: ${wanted.length - missing.length}/${wanted.length} names found`);
    problems += missing.length;
}
process.exit(problems ? 1 : 0);
