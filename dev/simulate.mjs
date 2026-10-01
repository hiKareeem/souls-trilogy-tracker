// DEV ONLY. Pretends to be the game clients so the tracker can be tested without the games.
// It SENDS location checks, so only point it at a throwaway test room.
//
//   node dev/simulate.mjs <server> <slot> [<slot> ...] [--every 1500] [--count 20] [--goal] [--area]
//
//   <server>   ws://localhost:38281 or wss://archipelago.gg:12345
//   --every    milliseconds between checks per slot (default 1500)
//   --count    checks to send per slot (default 20)
//   --goal     mark each slot's goal complete after its last check
//   --area     also publish a random Dark Souls Remastered area (what DSAP does)
//
// Locations holding progression items are checked first so the tracker's chips light up.
// Needs Node 22+ (built-in WebSocket).

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = args.indexOf(name);
    if (i === -1) return fallback;
    const value = args[i + 1];
    args.splice(i, 2);
    return Number(value);
};
const has = (name) => {
    const i = args.indexOf(name);
    if (i === -1) return false;
    args.splice(i, 1);
    return true;
};
const every = flag("--every", 1500);
const count = flag("--count", 20);
const goal = has("--goal");
const area = has("--area");
const [server, ...slots] = args;
if (!server || slots.length === 0) {
    console.error("usage: node dev/simulate.mjs <server> <slot> [<slot> ...] [--every ms] [--count n] [--goal] [--area]");
    process.exit(2);
}

const version = { major: 0, minor: 6, build: 7, class: "Version" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runSlot(name) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(server);
        const send = (...packets) => socket.send(JSON.stringify(packets));
        let game = null;
        let team = null;
        let slot = null;
        let missing = [];

        socket.onerror = () => reject(new Error(`${name}: could not reach ${server}`));
        socket.onmessage = async (event) => {
            for (const packet of JSON.parse(event.data)) {
                if (packet.cmd === "RoomInfo") {
                    // First connect as a tracker just to learn which game the slot plays.
                    send({ cmd: "Connect", password: "", game: "", name, uuid: `sim-${name}`, version,
                        items_handling: 0, tags: ["Tracker", "NoText"], slot_data: false });
                } else if (packet.cmd === "ConnectionRefused") {
                    reject(new Error(`${name}: refused (${packet.errors.join(", ")})`));
                    socket.close();
                } else if (packet.cmd === "Connected" && game === null) {
                    game = packet.slot_info[String(packet.slot)].game;
                    // Re-authenticate on the same socket as the real game client would.
                    send({ cmd: "Connect", password: "", game, name, uuid: `sim-${name}`, version,
                        items_handling: 0, tags: ["NoText"], slot_data: false });
                } else if (packet.cmd === "Connected") {
                    team = packet.team;
                    slot = packet.slot;
                    missing = packet.missing_locations;
                    send({ cmd: "LocationScouts", locations: missing, create_as_hint: 0 });
                } else if (packet.cmd === "LocationInfo") {
                    const progression = packet.locations.filter((i) => i.flags & 1).map((i) => i.location);
                    const rest = packet.locations.filter((i) => !(i.flags & 1)).map((i) => i.location);
                    const order = [...shuffle(progression), ...shuffle(rest)].slice(0, count);
                    console.log(`${name} (${game}): sending ${order.length} checks, ${Math.min(progression.length, order.length)} with progression items`);
                    for (const location of order) {
                        send({ cmd: "LocationChecks", locations: [location] });
                        if (area && game === "Dark Souls Remastered") {
                            send({ cmd: "Set", key: `DSR_current_map_${team}_${slot}`, default: 0, want_reply: false,
                                operations: [{ operation: "replace", value: 1 + Math.floor(Math.random() * 33) }] });
                        }
                        await sleep(every);
                    }
                    if (goal) send({ cmd: "StatusUpdate", status: 30 });
                    await sleep(500);
                    socket.close();
                    resolve();
                }
            }
        };
    });
}

function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

const results = await Promise.allSettled(slots.map(runSlot));
let failed = false;
for (const result of results) {
    if (result.status === "rejected") {
        console.error(result.reason.message);
        failed = true;
    }
}
process.exit(failed ? 1 : 0);
