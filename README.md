# Souls Trilogy Tracker

One overlay for an [Archipelago](https://archipelago.gg) run of **Dark Souls Remastered, Dark Souls II and
Dark Souls III**. It is a web page: add it to OBS as a Browser source. There is nothing to download or install.

Live page: <https://hikareeem.github.io/souls-trilogy-tracker/>

**New to Archipelago?** [TRILOGY-GUIDE.md](TRILOGY-GUIDE.md) walks through setting up the whole trilogy run.

Per game it shows:

- checks done out of the total, and whether the game's goal is complete
- the items the ending needs (Lordvessel and Lord Souls / King's Ring, Ashen Mist Heart, Giant's Kinship / the four Cinders)
- key items, plus counters (Fire Keeper Souls, Estus shards, bone shards and dust, Souls of a Giant)
- Dark Souls only: the area you are in (the Dark Souls Remastered client publishes it; the DS2 and DS3 clients do not)

Updates are live. Items found in one game for another show up straight away, even while that other game is closed,
because the Archipelago server holds them.

## What it does and does not do

- It connects to the Archipelago room as a **tracker** (the same kind of connection PopTracker makes) and only reads.
  The only messages it sends are `Connect`, `GetDataPackage`, `Get`, `SetNotify` and `Sync`. It never sends
  checks, goal status, chat or data, so it cannot change anything in the game. See `ap-client.js`.
- It does not touch the games or your files. It runs inside OBS's built-in browser like any other overlay.
- The page can only connect to **archipelago.gg** and to an Archipelago server **on this PC**. This is the
  `Content-Security-Policy` line at the top of `index.html`; the browser enforces it, so the page cannot send
  anything anywhere else.
- Settings are stored in the link after the `#`, which browsers never send to any server (GitHub included), or in the
  browser's local storage. If the room has a password, it is part of the OBS link, so treat the link like the password.

## Tracker setup

1. Open the tracker page in a normal browser (the live page above, or your own copy; see below).
2. Choose **archipelago.gg room**, paste the room link (`https://archipelago.gg/room/...`) and press
   **Find Dark Souls slots**. Untick any slot that is not yours. Enter the room password if there is one.
3. Press **Show tracker** to check that it works, then copy **Link for OBS**. To get back to the settings, hover
   over the page and click the gear in the bottom-right corner.
4. In OBS: **Sources → + → Browser**, paste the link as the URL. About **1400 × 600** fits the side-by-side
   layout at size 1; for **Stacked**, use about **460 × 1500**. The background is transparent.
   Set **Page permissions** to **No access to OBS**: the tracker uses no OBS features. OBS's default for new
   Browser sources lets a page read OBS status information.

archipelago.gg puts a room to sleep after two hours without activity. Opening the room page wakes it up. Meanwhile the
tracker keeps retrying by itself, and looks up the room's current port each time.

### Marking things by hand

Click an item to mark it yourself (in OBS: right-click the source → **Interact**). Counters go up one per click and
start again from zero after the maximum. Hand marks have a small dot so they are easy to tell apart from what the
server reports. Click **GOAL** to mark a game finished. **Clear manual marks** in the settings removes them for that room.

**Manual only** mode shows the same panels with no connection at all.

### Using your own copy (recommended)

Fork this repository on GitHub, then in the fork open **Settings → Pages**, choose **Deploy from a branch**,
branch `main`, folder `/ (root)`. Use your own `https://<your-name>.github.io/souls-trilogy-tracker/` link in OBS.
The code you run then only changes when you update your fork yourself.

### Other servers

- An Archipelago server on this PC: choose **Other server**, enter `localhost:38281` (or the port it prints) and the
  three slot names.
- Any other host (for example multiworld.gg): add it to `connect-src` in `index.html` in your fork. A server that only
  speaks plain `ws://` on another machine cannot be reached from an `https://` page; browsers block it.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page and settings form, plus the network policy |
| `style.css` | Look |
| `games.js` | What each panel shows. Edit this to change items or labels |
| `ap-client.js` | The Archipelago protocol (read-only tracker connection) |
| `app.js` | Settings, panels, hand marks |
| `dev/` | Tools for development only; the page never loads them |

No build step and no third-party code: the files above are exactly what runs.

## Development

Serve the folder (`python -m http.server 8765`) and open `http://127.0.0.1:8765/`.

For a test room, generate a multiworld that includes the Dark Souls Remastered and Dark Souls II `.apworld` files
in the Archipelago Launcher, then host it locally (`ArchipelagoServer`) or upload it to archipelago.gg.

- `node dev/simulate.mjs <server> <slot> [<slot> ...] [--count 20] [--every 1500] [--area] [--goal]`
  fakes the game clients by **sending checks**. Use it only on throwaway rooms.
- `node dev/check-item-names.mjs <server>` confirms every item name in `games.js` still exists. Run it after an
  apworld update; a renamed item would otherwise just never light up.

Both need Node 22 or newer.

Tested with Archipelago 0.6.7, the Dark Souls Remastered apworld 0.2.6 ([tathxo/DSAP](https://github.com/tathxo/DSAP)),
the Dark Souls II apworld 0.5.5-hotfix ([WildBunnie/DarkSoulsII-Archipelago](https://github.com/WildBunnie/DarkSoulsII-Archipelago))
and the Dark Souls III world that ships with Archipelago 0.6.7.
