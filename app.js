"use strict";

/* global TRILOGY_GAMES, SlotTracker */

const STORAGE_KEYS = {
    config: "trilogy.config.v1",
    marks: "trilogy.marks.v1",
    uuid: "trilogy.uuid",
};

const ROOM_STATUS_URL = "https://archipelago.gg/api/room_status/";
const ROOM_ID_PATTERN = /(?:\/room\/)?([A-Za-z0-9_-]{22})(?:[/?#]|$)/;

const $ = (id) => document.getElementById(id);

// ---------- Small helpers ----------

function storageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (err) {
        console.warn("localStorage unavailable; settings and hand marks will not persist", err);
    }
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function clampScale(value) {
    return Number.isFinite(value) ? Math.min(3, Math.max(0.5, value)) : 1;
}

function clientUuid() {
    let id = storageGet(STORAGE_KEYS.uuid);
    if (!id) {
        // crypto.randomUUID needs a secure context; OBS local files are not one.
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        storageSet(STORAGE_KEYS.uuid, id);
    }
    return id;
}

function gameDef(gameName) {
    return TRILOGY_GAMES.find((g) => g.game === gameName) || null;
}

function parseRoomId(text) {
    const match = ROOM_ID_PATTERN.exec(text.trim());
    return match ? match[1] : "";
}

/** Item names a chip counts: counters may sum several distinct items. */
function chipItemNames(def) {
    return def.items || [def.item];
}

function socketUrl(server) {
    const trimmed = server.trim();
    if (/^wss?:\/\//.test(trimmed)) return trimmed;
    const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(trimmed);
    return (local ? "ws://" : "wss://") + trimmed;
}

async function fetchRoomStatus(roomId) {
    let response;
    try {
        response = await fetch(ROOM_STATUS_URL + roomId, { signal: AbortSignal.timeout(15000) });
    } catch (err) {
        throw new Error(err.name === "TimeoutError" ? "archipelago.gg did not answer" : "Could not reach archipelago.gg");
    }
    if (response.status === 404) throw new Error("No room with that link on archipelago.gg");
    if (!response.ok) throw new Error(`archipelago.gg answered ${response.status}`);
    return response.json();
}

// ---------- Config ----------

/** Settings live in the URL fragment (never sent to any server) or, failing that, localStorage. */
function configFromHash(hash) {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    if (!params.has("room") && !params.has("server") && !params.has("manual")) return null;
    return {
        source: params.has("room") ? "room" : params.has("server") ? "server" : "manual",
        room: params.get("room") || "",
        server: params.get("server") || "",
        slots: params.getAll("slot").filter(Boolean),
        password: params.get("pw") || "",
        layout: params.get("layout") === "column" ? "column" : "row",
        scale: clampScale(Number(params.get("scale") || 1)),
        extras: params.get("extras") === "1",
    };
}

function configToHash(config) {
    const params = new URLSearchParams();
    if (config.source === "room") params.set("room", config.room);
    else if (config.source === "server") params.set("server", config.server);
    else params.set("manual", "1");
    if (config.source !== "manual") {
        for (const slot of config.slots) params.append("slot", slot);
        if (config.password) params.set("pw", config.password);
    }
    if (config.layout !== "row") params.set("layout", config.layout);
    if (config.scale !== 1) params.set("scale", String(config.scale));
    if (config.extras) params.set("extras", "1");
    return "#" + params.toString();
}

function loadConfig() {
    const fromHash = configFromHash(location.hash);
    if (fromHash) return fromHash;
    const saved = storageGet(STORAGE_KEYS.config);
    return saved ? configFromHash(saved) : null;
}

function profileKey(config) {
    if (config.source === "room") return `room:${config.room}`;
    if (config.source === "server") return `server:${config.server}`;
    return "manual";
}

// ---------- Hand marks ----------

const marks = {
    all: {},
    profile: "manual",

    load(profile) {
        this.profile = profile;
        try {
            this.all = JSON.parse(storageGet(STORAGE_KEYS.marks)) || {};
        } catch {
            this.all = {};
        }
    },

    get(key) {
        return (this.all[this.profile] || {})[key] || 0;
    },

    set(key, value) {
        const bucket = this.all[this.profile] || (this.all[this.profile] = {});
        if (value) bucket[key] = value;
        else delete bucket[key];
        storageSet(STORAGE_KEYS.marks, JSON.stringify(this.all));
    },

    clear(profile) {
        delete this.all[profile];
        storageSet(STORAGE_KEYS.marks, JSON.stringify(this.all));
    },
};

// ---------- Panels ----------

class Panel {
    constructor(id, slotName, tracker, showExtras) {
        this.id = id;
        this.slotName = slotName;
        this.tracker = tracker;
        this.showExtras = showExtras;
        this.def = null;
        this.chips = []; // { def, node, value }

        this.root = el("section", "panel");
        const head = el("div", "panel-head");
        this.title = el("span", "panel-title", slotName);
        this.slot = el("span", "panel-slot");
        this.goal = el("span", "panel-goal", "GOAL");
        this.goal.title = "Goal complete";
        this.goal.addEventListener("click", () => {
            marks.set(`${this.id}|__goal`, marks.get(`${this.id}|__goal`) ? 0 : 1);
            this.update();
        });
        head.append(this.title, this.slot, this.goal);

        const status = (this.statusRow = el("div", "panel-status"));
        this.dot = el("span", "dot");
        this.checks = el("span", "checks");
        this.statusText = el("span", "status-text");
        this.area = el("span", "area");
        status.append(this.dot, this.checks, this.statusText, this.area);

        this.milestones = el("div", "chips milestones");
        this.keys = el("div", "chips keys");
        this.counters = el("div", "chips counters");
        this.extras = el("div", "extras");
        this.root.append(head, status, this.milestones, this.keys, this.counters, this.extras);
    }

    setGame(def) {
        this.def = def;
        this.title.textContent = def.title;
        this.slot.textContent = this.slotName && this.slotName !== def.title ? this.slotName : "";
        this.root.style.order = String(TRILOGY_GAMES.indexOf(def));
        this.chips = [];
        const groups = [
            [this.milestones, def.milestones],
            [this.keys, def.keys],
            [this.counters, def.counters],
        ];
        for (const [container, defs] of groups) {
            container.replaceChildren();
            for (const chipDef of defs) {
                const node = el("button", "chip");
                node.type = "button";
                const chip = { def: chipDef, node, value: 0 };
                node.addEventListener("click", () => this.toggleMark(chip));
                container.append(node);
                this.chips.push(chip);
            }
            container.hidden = defs.length === 0;
        }
    }

    toggleMark(chip) {
        const key = `${this.id}|${chip.def.item}`;
        const max = chip.def.max || 1;
        const current = marks.get(key);
        marks.set(key, current >= max ? 0 : current + 1);
        this.update();
    }

    update() {
        const tracker = this.tracker;
        if (tracker && tracker.game && (!this.def || this.def.game !== tracker.game)) {
            this.setGame(gameDef(tracker.game) || { game: tracker.game, title: tracker.game, milestones: [], keys: [], counters: [] });
        }
        this.updateStatus();
        if (!this.def) return;

        const received = tracker ? tracker.receivedByName() : new Map();
        const fresh = tracker ? tracker.newItemNames() : new Set();
        for (const chip of this.chips) {
            const names = chipItemNames(chip.def);
            const server = names.reduce((sum, name) => sum + (received.has(name) ? received.get(name).count : 0), 0);
            const manual = marks.get(`${this.id}|${chip.def.item}`);
            const value = Math.max(server, manual);
            chip.node.textContent = chip.def.max ? `${chip.def.label} ${value}/${chip.def.max}` : chip.def.label;
            chip.node.classList.toggle("lit", value > 0);
            chip.node.classList.toggle("manual", manual > server);
            if (value > chip.value && server > 0 && names.some((name) => fresh.has(name))) flash(chip.node);
            chip.value = value;
        }

        const manualGoal = marks.get(`${this.id}|__goal`) > 0;
        const serverGoal = Boolean(tracker && tracker.goalComplete);
        this.goal.classList.toggle("lit", serverGoal || manualGoal);
        this.goal.classList.toggle("manual", manualGoal && !serverGoal);

        this.updateArea();
        this.updateExtras(received);
    }

    updateStatus() {
        const tracker = this.tracker;
        // Manual-only panels have no connection, checks or area to show.
        this.statusRow.hidden = !tracker;
        if (!tracker) return;
        const status = tracker.status;
        this.dot.className = `dot ${status}`;
        if (status === "connected") {
            this.checks.textContent = `${tracker.checked.size.toLocaleString()} / ${tracker.total.toLocaleString()}`;
            this.statusText.textContent = "checks";
        } else {
            this.checks.textContent = "";
            this.statusText.textContent = statusMessage(tracker);
        }
    }

    updateArea() {
        const def = this.def;
        const tracker = this.tracker;
        let name = "";
        if (def.areaKey && def.areas && tracker && tracker.status === "connected") {
            name = def.areas[tracker.storage[def.areaKey(tracker.team, tracker.slot)]] || "";
        }
        this.area.textContent = name;
    }

    updateExtras(received) {
        this.extras.replaceChildren();
        if (!this.showExtras || !this.tracker) return;
        const curated = new Set(this.chips.flatMap((c) => chipItemNames(c.def)));
        const names = [];
        for (const [name, entry] of received) {
            if (!entry.progression || curated.has(name)) continue;
            names.push(entry.count > 1 ? `${name} \u00d7${entry.count}` : name);
        }
        if (names.length === 0) return;
        this.extras.append(el("span", "extras-label", "Also:"), document.createTextNode(names.join(", ")));
    }
}

function statusMessage(tracker) {
    switch (tracker.status) {
        case "connecting":
            return "connecting\u2026";
        case "refused":
            return `refused: ${tracker.error}`;
        case "retrying":
            return `${tracker.error} \u2014 retrying`;
        default:
            return tracker.status;
    }
}

function flash(node) {
    node.classList.remove("fresh");
    void node.offsetWidth; // restart the animation
    node.classList.add("fresh");
}

// ---------- Overlay ----------

const overlay = {
    trackers: [],
    panels: [],

    start(config) {
        this.stop();
        marks.load(profileKey(config));
        document.documentElement.style.setProperty("--scale", String(config.scale));
        const root = $("overlay");
        root.className = `overlay ${config.layout}`;
        root.replaceChildren();

        if (config.source === "manual") {
            for (const def of TRILOGY_GAMES) {
                const panel = new Panel(def.id, "", null, false);
                panel.setGame(def);
                this.panels.push(panel);
            }
        } else {
            const uuid = clientUuid();
            const resolveUrl = config.source === "room"
                ? async () => {
                    const info = await fetchRoomStatus(config.room);
                    return `wss://archipelago.gg:${info.last_port}`;
                }
                : async () => socketUrl(config.server);
            for (const slotName of config.slots) {
                const panel = new Panel(slotName, slotName, null, config.extras);
                const tracker = new SlotTracker({
                    resolveUrl,
                    slotName,
                    password: config.password,
                    uuid,
                    extraKeys: (team, slot, game) => {
                        const def = gameDef(game);
                        return def && def.areaKey ? [def.areaKey(team, slot)] : [];
                    },
                    onChange: () => scheduleUpdate(panel),
                });
                panel.tracker = tracker;
                this.trackers.push(tracker);
                this.panels.push(panel);
            }
        }

        for (const panel of this.panels) {
            root.append(panel.root);
            panel.update();
        }
        for (const tracker of this.trackers) tracker.start();
        $("setup").hidden = true;
        root.hidden = false;
    },

    stop() {
        for (const tracker of this.trackers) tracker.stop();
        this.trackers = [];
        this.panels = [];
    },

    refresh() {
        for (const panel of this.panels) panel.update();
    },
};

// Several packets usually arrive together; render once per frame.
const pendingPanels = new Set();
function scheduleUpdate(panel) {
    if (pendingPanels.size === 0) {
        requestAnimationFrame(() => {
            for (const p of pendingPanels) p.update();
            pendingPanels.clear();
        });
    }
    pendingPanels.add(panel);
}

// ---------- Setup form ----------

const setup = {
    roomPlayers: [],

    init() {
        for (const radio of document.querySelectorAll('input[name="source"]')) {
            radio.addEventListener("change", () => this.syncSource());
        }
        $("find-slots").addEventListener("click", () => this.findSlots());
        $("start").addEventListener("click", () => this.start());
        $("reset-marks").addEventListener("click", () => this.resetMarks());
        $("open-setup").addEventListener("click", () => this.show(loadConfig()));
        $("obs-link").addEventListener("focus", (event) => event.target.select());
        $("setup").addEventListener("input", () => this.updateLink());
        $("setup").addEventListener("change", () => this.updateLink());
    },

    show(config) {
        overlay.stop();
        $("overlay").hidden = true;
        $("setup").hidden = false;
        if (config) this.fill(config);
        this.syncSource();
        this.updateLink();
    },

    fill(config) {
        document.querySelector(`input[name="source"][value="${config.source}"]`).checked = true;
        $("room").value = config.room ? `https://archipelago.gg/room/${config.room}` : "";
        $("server").value = config.server;
        $("password").value = config.password;
        $("layout").value = config.layout;
        $("scale").value = String(config.scale);
        $("extras").checked = config.extras;
        if (config.source === "room") {
            this.renderSlots(config.slots.map((name) => [name, ""]), new Set(config.slots));
        } else if (config.source === "server") {
            const inputs = [$("slot-ds1"), $("slot-ds2"), $("slot-ds3")];
            inputs.forEach((input, i) => (input.value = config.slots[i] || ""));
        }
    },

    source() {
        return document.querySelector('input[name="source"]:checked').value;
    },

    syncSource() {
        const source = this.source();
        $("room-fields").hidden = source !== "room";
        $("server-fields").hidden = source !== "server";
        $("password-field").hidden = source === "manual";
        this.updateLink();
    },

    async findSlots() {
        const roomId = parseRoomId($("room").value);
        const msg = $("room-msg");
        msg.classList.remove("error");
        if (!roomId) {
            msg.textContent = "That does not look like an archipelago.gg room link.";
            msg.classList.add("error");
            return;
        }
        msg.textContent = "Looking up the room\u2026";
        try {
            const info = await fetchRoomStatus(roomId);
            const souls = info.players.filter(([, game]) => gameDef(game));
            this.renderSlots(souls, new Set(souls.map(([name]) => name)));
            msg.textContent = souls.length
                ? `Found ${souls.length} Dark Souls slot(s) out of ${info.players.length} in the room.`
                : `No Dark Souls slots among the ${info.players.length} in this room.`;
        } catch (err) {
            msg.textContent = err.message;
            msg.classList.add("error");
        }
        this.updateLink();
    },

    renderSlots(players, checked) {
        const list = $("room-slots");
        list.replaceChildren();
        for (const [name, game] of players) {
            const label = el("label");
            const box = el("input");
            box.type = "checkbox";
            box.value = name;
            box.checked = checked.has(name);
            const def = gameDef(game);
            label.append(box, document.createTextNode(def ? `${name} \u2014 ${def.title}` : name));
            list.append(label);
        }
    },

    read() {
        const source = this.source();
        let slots = [];
        if (source === "room") {
            slots = [...$("room-slots").querySelectorAll("input:checked")].map((box) => box.value);
        } else if (source === "server") {
            slots = [$("slot-ds1"), $("slot-ds2"), $("slot-ds3")].map((i) => i.value.trim()).filter(Boolean);
        }
        return {
            source,
            room: parseRoomId($("room").value),
            server: $("server").value.trim(),
            slots,
            password: $("password").value,
            layout: $("layout").value,
            scale: clampScale(Number($("scale").value)),
            extras: $("extras").checked,
        };
    },

    problem(config) {
        if (config.source === "room") {
            if (!config.room) return "Paste the room link first.";
            if (config.slots.length === 0) return "Find the slots and tick at least one.";
        } else if (config.source === "server") {
            if (!config.server) return "Enter the server address.";
            if (config.slots.length === 0) return "Enter at least one slot name.";
        }
        return "";
    },

    updateLink() {
        const config = this.read();
        const base = location.href.split("#")[0];
        $("obs-link").value = this.problem(config) ? "" : base + configToHash(config);
    },

    start() {
        const config = this.read();
        const problem = this.problem(config);
        const msg = $("setup-msg");
        msg.classList.toggle("error", Boolean(problem));
        msg.textContent = problem;
        if (problem) return;
        const hash = configToHash(config);
        storageSet(STORAGE_KEYS.config, hash);
        history.replaceState(null, "", hash);
        overlay.start(config);
    },

    resetMarks() {
        const config = this.read();
        marks.load(profileKey(config));
        marks.clear(profileKey(config));
        $("setup-msg").classList.remove("error");
        $("setup-msg").textContent = "Hand marks cleared for this room.";
    },
};

// ---------- Boot ----------

setup.init();
window.addEventListener("hashchange", () => {
    const config = configFromHash(location.hash);
    if (config) overlay.start(config);
});
window.addEventListener("storage", (event) => {
    // Keep two copies of the page (e.g. an OBS dock and the source) in step for hand marks.
    if (event.key === STORAGE_KEYS.marks) {
        marks.load(marks.profile);
        overlay.refresh();
    }
});

const initial = loadConfig();
if (initial) overlay.start(initial);
else setup.show(null);
