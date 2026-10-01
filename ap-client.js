"use strict";

/*
 * Minimal Archipelago tracker client. One SlotTracker watches one slot.
 *
 * It is read-only by construction: it connects with the "Tracker" tag and the
 * only packets it ever sends are Connect, GetDataPackage, Get, SetNotify and
 * Sync. It never sends LocationChecks, StatusUpdate, Say or Set, so it cannot
 * change anything in the multiworld.
 *
 * Protocol reference:
 * https://github.com/ArchipelagoMW/Archipelago/blob/main/docs/network%20protocol.md
 */

const AP_CLIENT_VERSION = { major: 0, minor: 6, build: 7, class: "Version" };

// AP item flag bits (NetworkItem.flags).
const AP_FLAG_PROGRESSION = 0b001;

// ClientStatus value the server stores once a slot has finished its goal.
const AP_CLIENT_GOAL = 30;

// ConnectionRefused errors that retrying cannot fix.
const AP_FATAL_ERRORS = new Set(["InvalidSlot", "InvalidPassword", "InvalidGame", "IncompatibleVersion"]);

// Give up on a handshake that has not produced Connected after this long, then retry.
const AP_CONNECT_TIMEOUT_MS = 45000;

class SlotTracker {
    /**
     * @param {object} options
     * @param {() => Promise<string>} options.resolveUrl  Returns the ws:// or wss:// URL to (re)connect to.
     * @param {string} options.slotName
     * @param {string} options.password
     * @param {string} options.uuid
     * @param {(team: number, slot: number, game: string) => string[]} options.extraKeys  Data storage keys to watch.
     * @param {(tracker: SlotTracker) => void} options.onChange
     */
    constructor(options) {
        this.resolveUrl = options.resolveUrl;
        this.slotName = options.slotName;
        this.password = options.password || "";
        this.uuid = options.uuid;
        this.extraKeys = options.extraKeys || (() => []);
        this.onChange = options.onChange;

        this.status = "idle"; // idle | connecting | connected | retrying | refused
        this.error = "";
        this.team = null;
        this.slot = null;
        this.game = null;
        this.items = [];           // NetworkItem[] in server order (index-aligned with ReceivedItems.index)
        this.baseline = 0;         // items[0..baseline) were already held when this connection began
        this.syncing = false;      // true while handling the message that carried Connected
        this.checked = new Set();  // checked location ids
        this.total = 0;            // checked + missing location count
        this.itemNames = null;     // Map<item id, item name> for this slot's game
        this.storage = {};         // watched data storage values

        this.socket = null;
        this.stopped = false;
        this.retryMs = 2000;
        this.retryTimer = null;
    }

    start() {
        this.stopped = false;
        this.open();
    }

    stop() {
        this.stopped = true;
        clearTimeout(this.retryTimer);
        if (this.socket) this.socket.close();
    }

    get goalComplete() {
        return this.storage[this.statusKey()] === AP_CLIENT_GOAL;
    }

    statusKey() {
        return `_read_client_status_${this.team}_${this.slot}`;
    }

    async open() {
        this.setStatus("connecting", "");
        let url;
        try {
            url = await this.resolveUrl();
        } catch (err) {
            this.scheduleRetry(err.message);
            return;
        }
        if (this.stopped) return;

        let socket;
        try {
            socket = new WebSocket(url);
        } catch (err) {
            this.scheduleRetry(err.message);
            return;
        }
        this.socket = socket;
        // A handshake that never completes (e.g. a port nothing answers on) would otherwise
        // leave the panel on "connecting" until the OS gives up.
        const watchdog = setTimeout(() => {
            if (this.socket === socket && this.status !== "connected") socket.close();
        }, AP_CONNECT_TIMEOUT_MS);
        socket.addEventListener("close", () => clearTimeout(watchdog));
        socket.onmessage = (event) => {
            let packets;
            try {
                packets = JSON.parse(event.data);
            } catch (err) {
                console.warn("Unparseable packet from server", err);
                return;
            }
            for (const packet of packets) this.handle(packet);
            // The initial item list rides in the same message as Connected.
            this.syncing = false;
        };
        socket.onclose = () => {
            if (this.socket !== socket) return;
            this.socket = null;
            if (this.stopped || this.status === "refused") return;
            this.scheduleRetry(this.status === "connected" ? "Connection lost" : `Could not reach ${url}`);
        };
    }

    scheduleRetry(reason) {
        if (this.stopped) return;
        this.setStatus("retrying", reason);
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => this.open(), this.retryMs);
        this.retryMs = Math.min(this.retryMs * 2, 30000);
    }

    send(...packets) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(packets));
        }
    }

    handle(packet) {
        switch (packet.cmd) {
            case "RoomInfo":
                this.send({
                    cmd: "Connect",
                    password: this.password,
                    game: "",
                    name: this.slotName,
                    uuid: this.uuid,
                    version: AP_CLIENT_VERSION,
                    items_handling: 0b111,
                    tags: ["Tracker", "NoText"],
                    slot_data: false,
                });
                break;

            case "ConnectionRefused": {
                const errors = packet.errors || [];
                const reason = errors.join(", ") || "Connection refused";
                if (errors.some((e) => AP_FATAL_ERRORS.has(e))) {
                    this.setStatus("refused", reason);
                    this.socket.close();
                } else {
                    this.socket.close();
                    this.scheduleRetry(reason);
                }
                break;
            }

            case "Connected": {
                this.team = packet.team;
                this.slot = packet.slot;
                this.game = packet.slot_info[String(packet.slot)].game;
                this.checked = new Set(packet.checked_locations);
                this.total = packet.checked_locations.length + packet.missing_locations.length;
                this.items = [];
                this.baseline = 0;
                this.syncing = true;
                this.retryMs = 2000;
                const keys = [this.statusKey(), ...this.extraKeys(this.team, this.slot, this.game)];
                this.send(
                    { cmd: "GetDataPackage", games: [this.game] },
                    { cmd: "Get", keys },
                    { cmd: "SetNotify", keys },
                );
                this.setStatus("connected", "");
                break;
            }

            case "ReceivedItems":
                if (packet.index === 0) {
                    // Full list. Sent right after Connected, after a Sync, and also (with
                    // index 0) for the very first item a slot ever receives. Only items
                    // beyond what we already held count as new.
                    const held = this.syncing ? packet.items.length : this.items.length;
                    this.items = packet.items.slice();
                    this.baseline = held;
                } else if (packet.index === this.items.length) {
                    this.items.push(...packet.items);
                } else {
                    // Out of step with the server; ask for a full resend (arrives with index 0).
                    this.send({ cmd: "Sync" });
                    return;
                }
                this.changed();
                break;

            case "RoomUpdate":
                if (packet.checked_locations) {
                    for (const id of packet.checked_locations) this.checked.add(id);
                    this.changed();
                }
                break;

            case "DataPackage": {
                const data = packet.data.games[this.game];
                if (data) {
                    this.itemNames = new Map();
                    for (const [name, id] of Object.entries(data.item_name_to_id)) this.itemNames.set(id, name);
                    this.changed();
                }
                break;
            }

            case "Retrieved":
                Object.assign(this.storage, packet.keys);
                this.changed();
                break;

            case "SetReply":
                this.storage[packet.key] = packet.value;
                this.changed();
                break;

            default:
                // PrintJSON, Bounced, InvalidPacket etc. are not needed by a tracker.
                if (packet.cmd === "InvalidPacket") console.warn("Server rejected a packet", packet);
        }
    }

    /** Count of each received item name, plus whether any copy was progression. */
    receivedByName() {
        const counts = new Map();
        if (!this.itemNames) return counts;
        for (const item of this.items) {
            const name = this.itemNames.get(item.item);
            if (name === undefined) continue;
            const entry = counts.get(name) || { count: 0, progression: false };
            entry.count += 1;
            entry.progression = entry.progression || (item.flags & AP_FLAG_PROGRESSION) !== 0;
            counts.set(name, entry);
        }
        return counts;
    }

    /** Names of items that arrived while connected (not part of the initial sync). */
    newItemNames() {
        const names = new Set();
        if (!this.itemNames) return names;
        for (const item of this.items.slice(this.baseline)) {
            const name = this.itemNames.get(item.item);
            if (name !== undefined) names.add(name);
        }
        return names;
    }

    setStatus(status, error) {
        this.status = status;
        this.error = error;
        this.changed();
    }

    changed() {
        if (this.onChange) this.onChange(this);
    }
}
