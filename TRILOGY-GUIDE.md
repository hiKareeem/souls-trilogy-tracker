# Dark Souls Trilogy in Archipelago

One run across all three games. Items for any game can turn up in any of the three, so when you're stuck in one,
you play another. First-time setup takes about 30 minutes.

> [!IMPORTANT]
> **Check your game versions first.** The mods only work on the current Steam versions, and older ones crash the
> moment you connect.
> - **DS1 Remastered:** the title screen must say **App Ver. 1.03.1 / Regulation Ver. 1.04**
> - **DS2:** latest Steam version (Scholar or original)
> - **DS3:** **1.15.2**

**The whole thing:** install Archipelago → make three option files → generate → upload → install three game mods → play.

---

## 1. Download

Everything is on GitHub release pages.

| For | Get | Files |
|---|---|---|
| Everything | [Archipelago](https://github.com/ArchipelagoMW/Archipelago/releases/latest) | `Setup.Archipelago.<version>.exe` |
| DS1 | [DSAP](https://github.com/tathxo/DSAP/releases/latest) | `dsr.apworld` and the `dsr-Windows-x64` zip |
| DS2 | [DS2 Archipelago](https://github.com/WildBunnie/DarkSoulsII-Archipelago/releases/latest) | `dark_souls_2.apworld` and **one** DLL: `dinput8_sotfs.dll` (Scholar) or `dinput8_vanilla.dll` |
| DS3 | [DS3 Archipelago](https://github.com/fswap/from-software-archipelago-clients/releases?q=Dark+Souls+III&expanded=true) | `DS3.Archipelago.<version>-windows.zip` |

Unzip into a folder like `C:\Games\AP`. **Not** the Desktop (OneDrive breaks the DS3 mod) and not inside the game folders.

## 2. Install Archipelago

1. Run the installer.
2. Double-click `dsr.apworld` and `dark_souls_2.apworld` to add DS1 and DS2. DS3 is built in.

## 3. Make your option files

These are the "config files" archipelago.gg mentions: one YAML file per game.

1. Open the **Archipelago Launcher** → **Options Creator**.
2. Pick a game, type a player name, set the options.
   Names must be different and 16 characters at most, e.g. `MyDS1`, `MyDS2`, `MyDS3`.
3. **Export** into the `Players` folder (**not** `Players\Templates`).
4. Do the same for the other two games.

Worth checking:

- **DS2 → Game Version** must match the DLL you downloaded (Scholar = `sotfs`).
- **DLC:** only turn on DLC you own.
- Everything else is fine on defaults.

> [!TIP]
> Want to play the games one after another instead of swapping? Open each exported YAML in Notepad and, under the
> game's section, set `local_items: ['Everything']`. Each game then keeps all of its own items.

## 4. Generate and host

1. Launcher → **Generate**. You get `output\AP_<numbers>.zip` (**Browse Files** in the Launcher opens the folder).
2. Go to **[archipelago.gg/uploads](https://archipelago.gg/uploads)** and upload that zip.
3. Click **Create New Room** and bookmark the room page. It shows the address (`archipelago.gg:<port>`) and your three names.

Don't use archipelago.gg's **Generate** page; it doesn't know DS1 or DS2.

> [!WARNING]
> **Use this one room for the whole run.** Never make a new room for the same game. Rooms sleep after 2 hours
> without activity: opening the room page wakes it up, and **the port number can change** when it does.

## 5. Back up your saves

- DS1: `Documents\NBGI\DARK SOULS REMASTERED`
- DS2: `%APPDATA%\DarkSoulsII`
- DS3: `%APPDATA%\DarkSoulsIII`

## 6. Set up each game

Only the game you're playing needs to be running. Items found for the other two wait on the server.

### DS1 — Dark Souls Remastered

1. In the game: **System → Network Settings → Launch Setting → Start Offline**.
   Playing online with a modded save can get you banned.
2. Run `DSAP.Desktop.exe` → click **☰** → enter the address, `MyDS1` and the password (if any) → **Connect**.
3. Start a new character. **Keep DSAP open** the whole time you play.

> [!WARNING]
> **Kill Gwyn last.** Beating him starts NG+, and NG+ loses your key items.

### DS2

1. Rename your DLL to `dinput8.dll` and put it in the game's `Game` folder, next to `DarkSoulsII.exe`.
2. Launch the game. A console window opens; type `/connect archipelago.gg:<port> MyDS2`
   (add the password on the end if there is one).
3. Start a new game. The mod keeps DS2 offline. Delete `dinput8.dll` to play DS2 normally again.

### DS3

1. **Once per run:** start `randomizer\DS3Randomizer.exe`, enter the address, `MyDS3` and the password → **Load**.
   It takes a minute or two.
2. Start Steam (**not** in offline mode) and run `launch-ds3.bat`.
3. The overlay in the top-right corner shows the connection. If it fails, open the room page to wake it, then press
   **Reconnect**, or **Change URL** if the port changed.

## 7. Tracker for the stream

1. Open **<https://hikareeem.github.io/souls-trilogy-tracker/>** (or your own copy; see the README).
2. Paste the room link → **Find Dark Souls slots** → **Show tracker** → copy **Link for OBS**.
3. In OBS add a **Browser** source with that link, about **1400 × 600**. Set **Page permissions** to **No access to OBS**.

The tracker reconnects by itself when the room wakes up or changes port.

---

## Good to know

- **Stuck? Switch games.** A DS1 key can be sitting in DS3. The tracker shows what each game has received.
- **Finishing a game hands out everything left in it** to the other two, so you never have to go back to a finished game.
- **Each game has its own ending.** The run is done when all three show **GOAL**.
- **Each session:** open the room page first. If the port changed, update it in DSAP (DS1), in the `/connect`
  command (DS2) or with **Change URL** (DS3).
- **DS2 and newer Archipelago:** if a future Archipelago version refuses `dark_souls_2.apworld`, stay on 0.6.7
  until the DS2 project releases an update.

If something here disagrees with a game's own guide, that guide wins:
[DS1](https://github.com/tathxo/DSAP/blob/main/apworld/dsr/docs/setup_en.md) ·
[DS2](https://github.com/WildBunnie/DarkSoulsII-Archipelago#readme) ·
[DS3](https://nex-3.com/ds3/setup)

Versions current when this was written (October 2026): Archipelago 0.6.7, DSAP 0.2.6, DS2 Archipelago 0.5.5-hotfix,
DS3 Archipelago 4.0.2.
