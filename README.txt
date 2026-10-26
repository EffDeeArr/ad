ARBERIA DEATHMATCH - Windows and Linux
======================================

LINUX
=====
 0. You don't need a working Node.js: if the system one is missing or broken, BUILD.sh downloads
    its own private copy (needs curl, tar and xz; one-time ~30 MB). Otherwise:
 1. Install Node.js AND npm. On Arch they are separate packages:  sudo pacman -S nodejs npm
    (Debian/Ubuntu: sudo apt install nodejs npm, Fedora: sudo dnf install nodejs npm)
 2. Unzip, open a terminal in this folder, run:  ./BUILD.sh
 3. dist/ArberiaDeathmatch.AppImage is your game. Run it (chmod +x if needed). For a quick test without
    building: ./RUN-WITHOUT-BUILDING.sh
 - Linux and Windows players can play together: multiplayer uses plain WebSockets, so the host
   can be either OS and the others join with host-address:7777.
 - Hosting on Linux: if you use a firewall, allow TCP 7777 (e.g. sudo ufw allow 7777/tcp).
 - Build each OS's version on that OS (a Windows .exe is built on Windows, an AppImage on Linux).
 - Rendering: the game starts in software mode (works everywhere). Settings > Rendering can switch to hardware (GPU)
   and pick a graphics card. If hardware mode makes the graphics process crash, the game switches back to software by
   itself and tells you in Settings. You can force software with:  ./ArberiaDeathmatch.AppImage --disable-gpu
   (or set ARBERIA_NOGPU=1), or force hardware with --enable-gpu.
 - If the game crashes on start on Linux, launch it with ./PLAY-LINUX.sh (adds safe flags:
   --disable-dev-shm-usage). If it still won't start, try ./PLAY-LINUX.sh --no-sandbox
   (the game turns the sandbox off by itself only when your system can't run it).
 - Crash mentioning /dev/shm ("Unable to access /dev/shm"): the app now uses /tmp instead. If it still
   happens, run with:  ./ArberiaDeathmatch.AppImage --disable-dev-shm-usage
   and check the system with:  ls -ld /dev/shm   (should be drwxrwxrwt; fix: sudo chmod 1777 /dev/shm)
 - If the AppImage won't start, install FUSE 2 (Arch: sudo pacman -S fuse2, Debian/Ubuntu: libfuse2), or run it with --appimage-extract-and-run.

WINDOWS
=======
TO GET THE .EXE (one time, about 5 minutes):
 1. Install Node.js (LTS) from https://nodejs.org  (just click Next through the installer).
 2. Unzip this folder anywhere.
 3. Double-click BUILD.bat.
 4. When it finishes, dist\ArberiaDeathmatch.exe is your game. It is a single portable file:
    copy it anywhere, make a desktop shortcut, double-click to play. No browser, no Node needed after this.

JUST WANT TO TRY IT FIRST?
 Double-click RUN-WITHOUT-BUILDING.bat to launch the game window without making an .exe.

CONTROLS (unchanged): WASD move, mouse look, click fire, right-click scope (Sniper), R reload,
Tab status menu, F open chests, hold Left Ctrl to crouch, plus each power's key shown in its description.
Extra: F11 toggles fullscreen. Esc releases the mouse; click the game to grab it again.

MULTIPLAYER (3 modes)
 - Main menu > "Multiplayer". HOST: click "Host game". The lobby shows your address(es), e.g. 192.168.1.20:7777,
   and your public (internet) address, looked up once via api.ipify.org when you host. Friends type an address
   into "Join game". Windows Firewall will ask to allow the game the first time you host: click Allow.
   For internet play, forward TCP port 7777 on your router (TCP only, no UDP) or use Tailscale/ZeroTier.
 - Joining works from any copy of the game; HOSTING needs the desktop app. Windows and Linux can play together.
 - MODES (host picks in the lobby, or with the "mode" console command):
     Classic deathmatch: everyone picks 1 of 3 rolled weapons and 1 of 3 powers, free-for-all.
     Team deathmatch:    Red vs Blue, same picks as Classic. No friendly fire. Team total of kills counts.
                         Players can switch team in the lobby ("Switch my team"); the host can use "team".
     Brighton deathmatch (was Arsenal deathmatch): before the round there is a 20 second timer to pick ANY weapon with ANY power.
                         Unpicked choices are random. (Powers that only affect monsters or the world, like
                         Gravity well, Chrono bubble, Barrier, Cold snap, Corpse bomb, Ember, Barbed hide, are not offered.)
 - MAPS: random, dungeon, cavern, lab, crypt, manor, foundry, city, mineshaft, ctf. Pick in the lobby or use "map <name>".
 - Kills to win is set in the lobby (or "limit <n>"). Tab shows the scoreboard with kills, deaths and each player's ping.
 - Respawn 3 seconds after dying (2.5s of spawn protection). Player damage is 75% of normal weapon damage.

HOST CONSOLE (host only; press the backtick key, under Esc, in the lobby or in a match; Esc or backtick closes it)
 Commands: help, players, ip <player>, kick <player>, ban <player|ip>, unban <ip>, banlist, map <name>, maps,
 mode <classic|team|brighton|ctf|coop|cash>, limit <n>, team <player> <red|blue>, start, end, lobby, say <text>, clear.
 <player> is an id from "players" or part of a name. Bans last until you stop hosting. Players behind the same
 router share one public IP, so banning one can ban others in that household.
 "map <name>" during a match reloads the arena for everyone (scores are kept). "end" finishes the match and shows the winner.

CHAT, CAPTURE THE FLAG AND CUSTOM SKINS
 - Chat (100 characters max, separate from the host console): type in the chat box in the lobby and press Enter. During
   a match press Enter to open chat, Enter again to send (Esc closes). In team modes (Team deathmatch and Capture the
   flag) press Tab, or click the All/Team button, to switch between All chat and Team chat (only your team sees it).
 - CAPTURE THE FLAG ("ctf" mode, played on its own symmetrical "ctf" map with a red base on the west and a blue base on the
   east, each with colour-coded walls and floors). Grab the enemy flag by touching it and carry it to your own base;
   you score when you touch your own flag spot while YOUR flag is at home. If a carrier dies or leaves, the flag drops;
   touch your own dropped flag to return it, or it returns by itself after 20 seconds. The minimap shows flags.
   First team to the capture limit wins (host sets it in the lobby, default 3). You respawn in your own base.
   The host console has "mode ctf"; in ctf mode "map" is locked to the ctf map.
 - Custom skin: main menu > Settings > Upload image (PNG or JPG, up to 2MB). The image is cropped to a square, shrunk to
   64x64 and wrapped over your character model; the preview shows how it looks. Other players see it in multiplayer.
   The Settings screen has a "Download template" button: a 512x512 PNG showing where the head, body, arms, legs and gun land; paint over it in any image editor and upload it. It is remembered between launches. In Team deathmatch a small team-colour marker shows above skinned players.
 - Security: uploaded images are re-encoded to a small clean image before sending, and every client re-checks and
   re-draws what it receives, so a skin can't carry anything but pixels.

IMPORTING TF2 / SOURCE MAPS (.bsp)
 Main menu > Import map > Import .bsp. Pick a Source engine map (Team Fortress 2 maps are in your Steam folder:
 steamapps/common/Team Fortress 2/tf/maps; other Source games with BSP versions 19-21 usually work too, and
 compressed maps are supported). Then "Play it" for a single-player run on that map.
 How it works (v2.1, the map's real geometry): the game reads the map's actual faces, terrain (displacements),
 solid brushes. The 3D view is drawn by a software triangle renderer from the map's own
 triangles (everything in view is depth-sorted per pixel, so nothing is culled by guesswork). You walk on the map's real collision brushes and
 terrain, the way the Source engine does: stairs, ramps, ledges, falling and jumping (Space) all work, with mouse look
 up and down. 2fort's surface, bridge, river (you wade through the water), tunnels, buildings and intel rooms are one
 continuous world. There are no levels and no portals.
  - Textures are this game's own, picked from the map's material names (wood, brick, metal, dirt, grass, tile,
    concrete, team colours). Lighting is simple shading, not the map's baked lightmaps.
  - Solid brush objects (func_wall and similar) count. Moving parts work in a simplified way, see "Doors and moving parts" below.
  - Model props (crates, barrels, vehicles, plants) are left out: their shapes live in the game's model files, not in
    the map file, so they cannot be drawn or collided with accurately.
  - Invisible walls and sky boundaries from the map are kept as invisible walls. Invisible player-clip ramps and
    rails (often the collision for stairs and bridge sides that are really models) are drawn as faint dithered
    surfaces so you can see what you are standing on; bullets pass through them.
 Team spawns are used for Team deathmatch and Capture the flag.
  - Capture the flag works on imported maps that have flags: the intel (item_teamflag) and capture zones
    (func_capturezone) are read from the map, so on 2fort the intel sits in each team's basement intel room and you
    capture by carrying the enemy intel into your own intel room. Grabbing and capturing check height as well as
    position, so someone walking over the intel room does not take it.
  - 2fort's covered bridge: its slanted roof, beams and poles are models in the real game, so the game builds a
    matching roof and poles over the bridge deck (solid and drawn). Maps with no such bridge are not affected.
 Software rendering: the 3D view is drawn on a plain 2D canvas at 320x200, so it works without GPU acceleration.
 Multiplayer: the host hosts a game, then clicks "Import .bsp" in the lobby (not in the main menu) and picks the map; "custom" is selected
 for the match automatically (console: map custom). Switch the mode to Capture the flag there too, if you like, and start.
 When the match starts, every other player gets a file prompt and picks their own copy of the same .bsp. The game
 compares a SHA-256 ID of the file (plus the importer version) on the server: a different file, or a different game
 version, removes that player from the game. No map data is sent over the network. Imported maps are not kept
 between launches, so pick the file again after restarting. Importing takes a few seconds; the minimap fills in
 as the game finds the walkable areas in the background.
QUAKE 3 MAPS (.bsp): the same Import button also takes Quake 3 maps (BSP version 46). Quake 3 keeps its maps inside .pk3
 files (zip files): just pick the .pk3 (for example baseq3/pak0.pk3) and choose the map from the list. Everyone in a multiplayer
 match can pick either the .pk3 or the extracted .bsp: the file ID is taken from the map itself.
  - Collision is the map's own brushes and its curved patches, with Quake 3's own player size, step height, gravity and
    jump. Each face's brightness comes from the map's baked lightmaps; textures are this game's own, picked from shader names.
  - Jump pads (trigger_push) throw you along the same arc Quake 3 uses, and teleporters (trigger_teleport) move you to
    their destination. Moving parts work as described under "Doors and moving parts".
  - Capture the flag uses item_redflag / item_blueflag, and you capture by touching your own flag stand with the enemy
    flag, as in Quake 3. Team spawns come from team_CTF_redspawn / bluespawn.
  - Multiplayer works exactly as for Source maps (host imports in the lobby, everyone else picks the same file).
It only reads the map's layout data; nothing in a .bsp is ever run. Maps are Valve's content: use ones you own.

SECURITY (can another player run commands on my PC?)
 No. A joiner can only send the game a few small, fixed kinds of message (position, shot, hit, dead). Nothing a
 player sends is ever run as code, a shell command or a file path; every field is checked, limited and rebuilt
 before it is passed on. The host console commands are game commands (map, kick, ban...), not system commands,
 and only the host's own game window can use them: the host window gets a secret one-time token from the app
 when it starts the server, and joiners never see it. Also:
  - Joiners never learn each other's IP addresses. All traffic goes through the host. Only the host sees IPs.
  - Kills are credited by the server from who really damaged you, so a modified client can't award kills.
  - Flooding, oversized or malformed messages get a player disconnected. Max 3 connections per outside IP.
  - Names and text from other players are cleaned and escaped before display.
  - The game window can only show the game file: no navigation, no pop-ups, no permission prompts, a strict
    content-security policy, Chromium sandbox on, and the app's host/IP functions refuse any other page.
  - If the host leaves, the session ends for everyone (nobody else can inherit the console).
 What is NOT prevented: players simulate themselves and report their own hits, so someone running a modified
 game can still cheat (aimbot, god mode). Only play with people you trust, and use "kick"/"ban" if needed.
 When hosting, you are opening port 7777 to whoever has your address: share it only with friends. If you use a
 tunnel service (ngrok, Tailscale funnel), everyone appears as 127.0.0.1, so ban/IP limits can't tell them apart.

NOTES
 - The game file is game\index.html, exactly the same game as in the browser.
 - The pixel font is loaded from Google Fonts when you are online; offline it falls back to a
   system monospace font (gameplay is identical).
 - Windows SmartScreen may warn about an unsigned app the first time. Click "More info" > "Run anyway".


Doors and moving parts (imported maps)
  Source:  func_door, func_movelinear, func_door_rotating (swinging doors), func_rotating (fans, spinners),
           func_train and func_tracktrain (they follow their path_track / path_corner chain, back and forth
           if the path is not a loop).
  Quake 3: func_door, func_plat, func_bobbing, func_train, func_rotating, func_pendulum.
  Triggers: buttons and trigger volumes are run for real.
    Source: trigger_multiple / trigger_once / func_button outputs (OnStartTouch, OnEndTouch, OnTrigger,
            OnPressed ...) with Open, Close, Toggle, Lock, Unlock, Start, Stop and logic_relay chains,
            including delays and names with a * wildcard. On 2fort the spawn doors work this way.
    Quake 3: trigger_multiple / trigger_once / func_button targets, with target_relay and target_delay.
  Doors that nothing triggers open by proximity: you, another player or a monster standing near is enough.
  Doors with a name that something points at only open when that something fires.
  Bobbing platforms, spinners, pendulums and trains follow the clock, so everybody sees about the same thing.
  A lift or a spinning platform carries you; a door or a spinner that hits you pushes you out of the way.
  Not supported:
    - Props that animate or move on their own (prop_dynamic animations, ragdolls, physics props): the model
      files are not part of the map file.
    - Trains that turn to follow their track, and brush entities parented to other moving things.
    - Key doors: nothing in these maps gives you a key. A locked door with nothing to unlock it opens by
      proximity instead.
    - Team filters on triggers (any team can fire them), and shooting a door open.
  Maps imported with an older version must be imported again.

Looks of imported maps
  Textures are not part of a .bsp, so surfaces get stand-in textures chosen from the material name (concrete,
  brick, wood, metal, tile, dirt, rock ...). Their size follows the real texture size and Source maps are lit
  from the map's own baked lighting, so rooms get their real light and shadow. Maps imported with an
  older version look different until imported again.

Real game textures (desktop app)
  Settings > Game textures > Choose folder. Pick your Team Fortress 2 folder (the one that has "tf" inside, or
  the "tf" folder itself). The app reads the textures straight out of your own game's .vpk files
  (tf2_textures_dir.vpk, tf2_misc_dir.vpk, hl2_textures_dir.vpk ...) and also loose "materials" folders. The folder is
  remembered; "Forget folder" clears it. Textures are loaded when a Source map starts; nothing is copied or uploaded
  and other players are not affected. Materials the app cannot find keep their stand-in texture. Not available in
  the browser version. Quake 3 maps are not covered yet.

Stairs and railings (Source maps)
  Stair and railing models are not in a .bsp, only invisible collision walls and ramps for them. Where such a
  wall or ramp has nothing visible on it, the importer builds simple stand-in models you can see: stepped stairs
  on ramps and posts with rails on thin upright walls. They are for looks only; the collision stays the map's own.

Minecraft worlds (Java Edition, 1.13 and newer)
===============================================
Import button (Custom map, or the multiplayer lobby) -> pick a region file (.mca). Region files are in your world's folder:
  Windows: %appdata%\.minecraft\saves\<your world>\region\r.0.0.mca (the names are r.X.Z.mca, one per 512 x 512 block area)
  Linux:   ~/.minecraft/saves/<your world>/region/
  Copy the world first if you like; the game only reads the file.
A box asks for a coordinate: type X and Z as the F3 screen in Minecraft shows them (or click a green square, a chunk that has
terrain). The map is the chunk that coordinate is in plus the chunks around it as a square: just that chunk, or 1, 2 or 3 chunks
around it (up to 7 x 7 chunks = 112 x 112 blocks). Near the edge of the file the square is shifted to fit. The coordinate must be
inside the file you picked (r.X.Z.mca covers 512 x 512 blocks: X from X*512, Z from Z*512); the box tells you which file if not.
The area is small on purpose: every player needs the same area, and the game draws everything in software.
What you get: the terrain and everything built in it, as real blocks. One block is half a world unit, so you are about 1.75 blocks
tall, can step up half a block (slabs and stairs) and jump a bit over one block, like in Minecraft. Water is swum in: you sink
slowly, hold Space to swim up, move slower, and can hop out at the edge. Jump while swimming at the edge to climb out onto the
bank. Nobody is placed in water at the start; monsters and items are put on dry ground, and monsters will not walk into water.
The sky is blue on Minecraft maps.
The shapes that are drawn: full blocks, slabs, stairs (all corner shapes), fences, walls, glass panes and iron bars (they connect),
snow layers, carpets, beds, chests, enchanting tables, crafting tables / furnaces and similar (with their fronts), and crossed plants (grass, flowers, saplings, crops). Water and lava are see-through (lava does not hurt).
Left out: doors, trapdoors, ladders, torches, signs, rails, redstone and other small parts are not drawn and do not block you;
no mobs, items, chest contents, villagers or biome colours (grass is one plains green).
Textures: by default this game's own pixel art made from the block's name. To get the real ones: Settings -> Minecraft textures ->
Choose folder, and pick your .minecraft folder (or a folder or file holding a Minecraft client .jar). The game reads the block
pictures from the newest version it finds there (versions/<version>/<version>.jar, a zip file) on your computer; nothing is
copied or uploaded and the game files are never changed. Grass, leaves and water get a fixed plains tint. Desktop app only.
Re-import (or re-enter) a world after linking the folder. Blocks it has no picture for keep the stand-in look.
Lighting: the light stored in the save is used (sunlight, torches, glowstone), in a few steps per face. Chunks that were never
lit by the game get simple sun/shade lighting. The area is closed by invisible walls and an invisible floor.
Worlds from before 1.13 (numbered blocks) are refused; open them once in a current Minecraft first. LZ4-compressed region files
(a rarely used server option) and Bedrock Edition worlds are not supported.
Multiplayer: the host imports the .mca and types the coordinate; everybody else is asked to pick their own copy of the same .mca.
The game then cuts out exactly the host's area (each player uses their own textures), and the file must be byte for byte the same (SHA-256), or the player is removed.
Minecraft is a trademark of Mojang/Microsoft; use your own worlds.

First-person weapons (2.9.0)
All 13 weapons now have their own small 3D model that you see in your hands: pistol, scattergun (double barrel), rattler (drum
magazine), lance (glowing coil), twin fang (one in each hand), hand cannon (revolver), fan gun (five barrels), needler
(see-through magazine), marksman (scope), sniper (big scope and bipod), reaper axe, twin daggers and quake hammer. They are
drawn with flat-shaded shapes, take the weapon's colour, recoil when you shoot, tilt when you reload, and the melee weapons swing.
Other players' weapons are still drawn as flat pictures.

3D characters and hit zones (2.10.0)
Players and human enemies are now small 3D models (head, neck, body, arms, legs, gun) that turn to face the way they are looking, so
you see their backs and sides. Your custom skin image still works the same way: it is wrapped over the FRONT of the head, body,
arms and legs (use the template button to see where each part lands); the sides and back take the average colour of that part of
the picture. Download the template again if you made yours before, since the shapes are now boxes.
Hit zones: head shots do 2.5x damage, chest 1x, legs 0.6x. The head is narrower than the body, so it is harder to hit, and you see
HEADSHOT / LEG SHOT at the crosshair. This also applies to other players in multiplayer. Melee hits the whole body.
Aiming up and down now works in the normal dungeon too (mouse up/down); the view tilts like in the imported maps. Other monsters
(not human) are still hit all over as before.

Metal barricades and sheets in Source maps (2.10.1)
Corrugated metal sheets and barricades (for example the ones in the middle of 2fort) are models in the real map, not part of the
.bsp, so they used to be missing. They are now added as boxes with the real size of the model (read from your linked game folder),
tilted the way the map places them, drawn with the model's own metal texture. The ones the map makes solid block you and give cover;
the loose leaning ones are just for looks. Without a linked game folder (or in the browser) a typical sheet size is used instead.
Multiplayer: because the size comes from your game files, everyone has to import the same way. If the host has the game folder
linked, joiners need theirs linked too; otherwise the match reports a version mismatch for that player.

Props in Source maps (2.11.0)
Static props (barrels, crates, planks, sheets, pipes, plants, signs and so on) are models in the real map, not part of the .bsp. With
your game folder linked (Settings > Game textures), the importer now reads each prop's real model from the game files and draws it,
with its own textures, where the map places it (lowest detail level, so it stays fast). Props the map marks solid and that are
cover-sized (up to about 2.5 metres across) also block you, using the model's real bounding box. Big structures are drawn but not
solid, since the map already has invisible walls for them.
Without a linked game folder (or in the browser) props are still left out, except metal sheets and barricades, which are drawn as
boxes of a typical size. Far-away small props are not drawn, to keep the frame rate up; the frame rate can be about a third lower
in prop-heavy maps like 2fort. Multiplayer: everyone must import the same way (all with the game folder linked, or none).

Co-op and Cash deathmatch (2.12.0)
New multiplayer modes, picked in the lobby (the host console takes: mode coop, mode cash).
Co-op: like a solo run with other people. Everyone fights the same monsters on the same floors, with no player-vs-player.
Each player rolls their own weapon and power. The host's computer runs the monsters; they go for the nearest player who is still
up, and everyone shoots the same monsters. Kills count on the scoreboard. If you die you stay down until someone in the group
reaches the open portal; then the whole group moves to the next floor, everybody gets up (at half health), and everyone picks an
upgrade card. The run ends when the whole group is down at the same time. Works on random floors and on imported maps (not the
Capture the flag map). Late joiners drop in on the current floor.
Cash deathmatch: a normal deathmatch where everyone starts with $500 and gets $100 for every kill on another player. You start
with a plain pistol; weapons and powers are bought in a shop that opens before the round (20 seconds), every time you respawn
(12 seconds) and when you press B (10 seconds, at most every 25 seconds). While the shop is open nobody can hurt you. The server
keeps everyone's balance, so it cannot be edited. Prices follow how good the item is (a Pistol or Rattler is about $100, a Fan
gun $280; Hair trigger $100, Phoenix heart $350). Each copy of a power you already own raises its next price by 50%.
Arsenal deathmatch was renamed Brighton deathmatch.

Build warnings (2.12.1)
The long list of "npm warn deprecated" lines during BUILD is not an error: it comes from old pieces inside the packaging tool. The
tool and Electron were updated to newer major versions (electron-builder 26, Electron 37), the native-module rebuild step (the main
user of the old pieces) is switched off since the game has no native modules, and a .npmrc hides any leftover notices. If a build
fails after updating, delete the node_modules folder and package-lock.json, then run BUILD again.

File picker fix (2.12.2)
The Import map, Choose map file and skin Upload buttons now open the system's own file dialog through the app (instead of the web page's
built-in picker, which did not appear for some Linux users). It filters to the right file types and still has an "All files" option.

In-game file browser on Linux (2.12.3)
On Linux the Import map, Choose map file and skin Upload buttons now open a file browser built into the game (folder list on the left
with shortcuts to Home, Downloads, Steam, Minecraft saves, /mnt and /media, a path box you can type into, and the folders and files in
the middle). It does not depend on the system's file dialog, which does not open on some Linux setups. Windows and macOS still use the
normal system dialog. Only map and skin file types (.bsp .pk3 .zip .mca .png .jpg) can be opened through it.

Score limit fix (2.12.4)
Switching the lobby to Capture the flag now really sets the default limit to 3 captures (and back to 20 kills when switching away), and
the host's limit menu always shows the limit that is actually in effect. Before, the menu's old value overwrote the new default, so the
host saw "1" while the match really ran to 20.

Resolution setting (2.12.5)
Settings now has a Display section with a list of resolutions, grouped by shape: 16:10 (320x200 is the original look, up to 3840x2400),
16:9 (640x360 up to 3840x2160), 4:3 (640x480 up to 2048x1536) and 5:4 (1280x1024, 2560x2048). The choice is remembered. The HUD, text,
weapon models, minimap and bars scale with the resolution, and wider shapes show more of the sides instead of stretching. The picture
keeps its shape in the window (black bars only if the window shape differs from the chosen one).
The game is drawn by the processor, so high resolutions are demanding: 1920x1080 and above can run slowly on weaker computers, and the
2560-wide and 3840-wide choices are marked "heavy". If it stutters, pick a lower one. Imported maps cost more per pixel than the normal levels.

Rendering setting (2.12.6)
Settings now has a Rendering section: Software (the default) or Hardware (GPU). With Hardware you get a list of the graphics cards
the system reports, plus Automatic. Changes apply after a restart (the button appears when needed); a match you are hosting ends when
the game restarts. Settings shows what is actually running, which card is in use, and the canvas status.
What hardware mode does: the graphics card presents the picture and draws the HUD/text/weapons, which helps most at high resolutions.
The 3D scene itself (walls, floors, sprites, imported maps) is still calculated by the processor, so frame rates will not jump the
way they would in a game built for the GPU.
Choosing a card: on Windows the game asks for that exact adapter when the system reports its ID (Windows' own Settings > System >
Display > Graphics per-app choice can still override it). On Linux, picking a card that is not the system default turns on PRIME render
offload (NVIDIA or Mesa). On macOS the system decides. If the card you pick is not used, the "in use" line in Settings shows what is.
The launcher PLAY-LINUX.sh no longer forces --disable-gpu; software is simply the default now.

Turrets, recoil and weapon changes (2.12.7)
- Sentry turrets placed by other players are now visible in multiplayer (and in co-op), and you see their shots. The owner's game still
  decides the damage, and the server relays it like any other hit.
- Recoil: the Sniper, Lance, Marksman, Hand cannon and Scattergun kick the view upward when fired; it settles back down within about half
  a second (less kick while aiming down sights).
- Twin daggers: +15% movement speed while held.
- Fan gun: damage doubled (18-26 per pellet).
- Hand cannon: reload time 50% longer.

Lance nerf, Field medic power, CTF turrets (2.12.8)
- Lance: damage -10% (63-99) and fire rate -5%.
- New power "Field medic" (key X): drops a medkit in front of you; you or a teammate who walks over it heals 50 HP (someone at full
  health does not use it up, so it stays for others). 10 second cooldown. It is only offered in team deathmatch, capture the flag and
  co-op (never in singleplayer, classic, Brighton or cash modes). The server decides who gets each medkit, so two people stepping on
  it at once can't both heal, and enemies can't use yours. Medkits show on the minimap as green dots and disappear after a minute.
- Capture the flag: turrets last three times as long (36 s instead of 12 s at one stack).

One turret each, Sniper change (2.12.9)
- Sentry turret: only one per player at a time; placing a new one removes your old one. Extra copies of the power now add 3 s of life
  instead of another turret.
- Sniper: magazine is 2 rounds and reload is 30% longer.

Sniper zoom (2.12.10)
Aiming down the sniper's sights now zooms in 25% more (3.1x magnification instead of 2.5x). Mouse turning while zoomed is scaled to match.

In-game file browser on Windows and macOS too (2.12.11)
The built-in file browser that Linux got in 2.12.3 is now used on every platform in the desktop app, because the system file dialog
also failed to appear for some Windows players. On Windows the side list has your Desktop, Downloads and Documents (wherever Windows
keeps them, including OneDrive), the Steam "common" folder, your Minecraft saves, and every drive (C:, D:, ...). You can also type or
paste a path (like D:\Games\maps) into the path box. The older system dialog is only used if the browser is unavailable.

Paste a path (2.12.12)
The in-game file browser now has a box under the file list: paste the full path to a file (quotes from Windows "Copy as path" are fine)
and press Enter or Open. If you paste a folder instead, the browser opens that folder. A missing file or a wrong file type shows a
message and leaves the window open.

File picker fix for some Windows PCs (2.12.13)
Some Windows players found the map file picker did nothing in 2.12.2 and later. The app checks that file requests come from its own game
page, and that check compared the page's address too literally, so Windows spellings of the same path (drive letter case, slashes,
URL encoding) could be refused with no message. The check now compares normalised paths. If a request is still refused, the picker
now shows the reason on screen and automatically opens the system file picker instead. The reason is also saved to ipc-denied.txt in
the game's data folder (%APPDATA%\Arberia Deathmatch\ on Windows).

backup.txt for multiplayer maps (2.12.14)
When a multiplayer match is played on an imported map (like ctf_2fort or de_dust2), the game normally asks you to pick your own copy of the
file. Now it first looks in backup.txt: if the map is listed there, it loads the file from the path you wrote and sends it to the server
for checking, with no file picker. If the map is not listed, or the path is wrong, you get the normal picker (with a message saying why).
The file is next to ArberiaDeathmatch.exe (or next to the app when run from source) and is created with a template on first use; if that folder
is not writable it is kept in the game's data folder (%APPDATA%\Arberia Deathmatch\ on Windows). Write one line per map:
    ctf_2fort = C:\Program Files (x86)\Steam\steamapps\common\Team Fortress 2\tf\maps\ctf_2fort.bsp
    de_dust2  = D:\Maps\de_dust2.bsp
Lines starting with # are ignored. It must still be the host's exact file, or the server removes you as before.

Maps next to the game load automatically (2.12.15)
If a multiplayer match asks for a map and backup.txt does not list it, the game now also looks for <mapname>.bsp (or .pk3) in the same folder
as the game (ArberiaDeathmatch.exe), and in a "maps" folder there. So just drop ctf_2fort.bsp and de_dust2.bsp next to the game and joining
works with no picker and no backup.txt. backup.txt still wins if it lists the map.

Barrier projector in multiplayer (2.12.16)
The Barrier projector power (V) can now be picked in every multiplayer mode (arsenal and the cash shop). Same as singleplayer: 12 health
(+6 per extra copy), 7 second cooldown, one wall per player at a time. You and your teammates shoot through it; enemies cannot: their
shots (and melee swings) stop at the wall and wear it down. In free-for-all modes only the owner shoots through. Enemy walls show red,
yours and your team's show blue. In co-op, monsters can't pass or shoot through anyone's wall. Walls are cleared when a match starts.

Barbed hide, Cold snap and Scavenger in multiplayer (2.12.17)
These three powers can now be picked in the arsenal and (Scavenger too) bought in the cash shop.
- Barbed hide: an enemy player who hits you with a melee weapon takes 15 damage per copy back (the same 25% player-versus-player damage
  reduction every player hit gets, so 20 becomes 15). Bullets are not reflected.
- Cold snap: enemy players within 3.5 tiles of you move at half speed. Not used in co-op against teammates; monsters are still slowed.
- Scavenger: each copy gives a chance for a heart (+20 HP, only you can see and pick it up) to drop where a player you killed fell.
  Co-op monsters still drop hearts as before.

Hand cannon, medkit, and the new Bomb defusal mode (2.12.18)
- Hand cannon: reload is another 25% longer.
- Field medic: if you pick up your own medkit it heals 25 HP; a teammate who picks it up still gets 50.
- Bomb defusal (new multiplayer mode, pick it in the lobby): a Counter-Strike style plant / defuse game, best of 5 (first team to win
  3 rounds). One team attacks, the other defends, and the sides swap after round 3.
  * Everyone picks a weapon and power in the loadout screen before round 1 and keeps them all match. Each round starts with a 6 second
    freeze time at your spawn, then 1:55 on the clock. You have full health and ammo every round. If you die you are out until the next round.
  * One attacker carries the bomb (shown in the HUD). Hold F inside a bombsite (the orange A / B rings) for 3 seconds without moving
    to plant it. The bomb then explodes after 40 seconds. If the carrier dies the bomb drops; any attacker can pick it up by walking over it.
  * Defenders hold F beside a planted bomb for 10 seconds to defuse it. Only one person can defuse at a time, and moving cancels it.
  * A round is won by: the bomb exploding (attackers), the bomb being defused (defenders), eliminating the other team (but if the bomb
    is already planted, defenders must still defuse it), or the clock running out before a plant (defenders).
  * It works on the generated maps (two bombsites and two far-apart spawn areas are worked out from the map, the same for everyone)
    and on Counter-Strike maps such as de_dust2 (its func_bomb_target sites and terrorist / counter-terrorist spawns are used; terrorists attack).
    The host needs to have imported the map as usual. A map with no bomb sites cannot be used for this mode.
  * There is no buying or money; the loadout is chosen once. Medkits, turrets and barriers are cleared each round.

Heavy weapon speed (2.12.19)
Moving with the Hand cannon or the Sniper is 10% slower. Bomb defusal was also tried on a real de_dust2.bsp: both bombsites and the
terrorist / counter-terrorist spawns are found, and planting and defusing work.

Hand cannon recoil (2.12.20)
Hand cannon recoil is 50% stronger, now the strongest of any weapon (Sniper was the highest before).

Bomb defusal: money and a buy phase (2.12.21)
This replaces the old "pick a loadout once" screen. Everyone starts the match with a pistol and $500 and shops in a 15 second buy phase
(the freeze time) before every round. Press B during the freeze time to reopen the shop if you closed it. Nobody can be hurt while shopping.
- Weapons and powers cost the same as in Cash deathmatch (better ones cost more) and, once bought, are kept for the whole match.
- Shields: Shield 25 ($250) and Shield 50 ($450). Only one at a time; buying 50 while you hold an intact 25 costs only the difference ($200).
  A shield soaks up damage before your health is hit. A shield you still have at the end of a round carries over (with whatever is left),
  but one that broke, or that you died with, is gone next round and has to be bought again.
- Income: round win $1000, round loss $700 (+$150 for each loss in a row, up to +$450), each kill $100, planting or defusing $200. Maximum $3000.

Pricier guns and shields in Bomb defusal (2.12.22)
Weapons cost double what they do in Cash deathmatch (the pistol you start with is free). Shield 25 is now $450 and Shield 50 is $800 (upgrading an intact 25 to a 50 costs $350). Powers are unchanged.

2.12.23 - Radial buy menu (Bomb defusal)
- The buy phase is now a CS-style wheel. Root slices: Close, Medium, Long, Powers, Shields. Click a slice (or press its number) to open a wheel of just those items; Backspace or the middle goes back.
- Weapon ranges follow each gun's damage falloff: Close = melee, Scattergun, Fan gun; Medium = Pistol, Rattler, Twin fang, Needler; Long = Lance, Hand cannon, Marksman, Sniper.
- Powers are split into Offense, Defense, Abilities and Utility wheels. Hover a slice for its description and price.
- Fan gun is $200 cheaper in Bomb defusal (now $1120).

2.12.24 - Smoke bomb power
- New power "Smoke bomb" (Z): throws a smoke grenade up to 7 tiles ahead. The cloud (about 2.3 tiles in radius) lasts 7s, +2s per extra copy; 20s cooldown.
- Nobody can see through it, you included, and enemies and bots lose line of sight across it. Bullets still pass through.
- Works in single player and every multiplayer mode (the cloud is shown to all players). Listed under Utility in the Bomb defusal buy wheel ($110).

2.12.25 - Fan gun price halved
- Fan gun now costs half as much in every shop: $330 in Cash deathmatch, $560 in Bomb defusal.

2.12.26 - Gun prices +50%
- Every gun except the Fan gun costs 50% more in every shop (Cash deathmatch and Bomb defusal). Fan gun prices are unchanged at $330 and $560.

2.12.27 - Bomb defusal lobby fix
- Fixed the lobby screen staying on top of the game for the first few seconds after a Bomb defusal match starts, before the first buy phase.

2.12.28 - Dust2 sites, radar, footsteps, shield bar
- de_dust2: bombsites A and B are swapped.
- Bomb defusal: the minimap no longer shows enemy positions (teammates only).
- Multiplayer (all modes): other players' footsteps are audible with directional stereo audio. They are louder when close, duller when behind you or behind a wall, and inaudible past about 16 tiles.
- Shield is now a blue bar above the health bar, and the ammo counter sits above it.

2.12.29 - Energy shield power
- New power "Energy shield" for multiplayer modes other than Bomb defusal (also in the Cash deathmatch shop for $150 and the Brighton loadout). You start each life with a 50 shield that soaks damage before your health, but it drains 1 per second and stops at 0. Extra copies add 25 to the starting shield. It shows as the blue bar above your health.

2.12.30 - Weapon stats for hosts (stats.txt)
- When you host a game, the server keeps weapon statistics and saves them to stats.txt next to the game (same place as backup.txt; it is created on first host).
- Per weapon: Use % (share of all player time spent holding that weapon at any given moment, not "ever used"), time held, kills, deaths, K/D, wins and losses. All 13 weapons are listed, sorted by use.
- Wins and losses count one per round in Bomb defusal and one per match in the other modes, credited to the weapon the player held most. Co-op is not tracked.
- Totals keep adding up between sessions. Delete stats.txt to reset. It is saved every 30 seconds, at the end of each match or round, and when you stop hosting.

2.12.31 - Gun Game mode
- New multiplayer mode "Gun Game" (host console: mode gungame). Everyone starts with the first weapon and moves to the next one after each kill on another player. The ladder is Pistol, Scattergun, Rattler, Lance, Twin fang, Hand cannon, Fan gun, Needler, Marksman, Sniper, then the melee weapons (Reaper axe, Twin daggers, Quake hammer). The first player to get a kill with the last weapon wins.
- The host can tick "Random weapon order" in the lobby. All 13 weapons, melee included, are shuffled when the match starts and the order is the same for every player.
- No powers in this mode. Players who join late start on the lowest weapon level currently in play. The HUD shows your level, your weapon and the next one, and the current leader. Weapon stats (stats.txt) include Gun Game.

2.12.32 - Gun Game random order now includes the melee weapons in the shuffle (they no longer always come last).

2.12.33 - Ninja sword
  - New melee weapon: the Ninja sword. A curved katana with a gold guard, wrapped handle and a tassel that lags behind the swing.
    It is the highest-poly weapon in the game (about 1,170 faces; the next highest is about 180).
  - Swing combo: slash left-to-right, slash right-to-left, then a full spinning finisher that hits all around for 30% more damage
    with a little extra reach. The combo resets if you pause for more than about a second. Slashes leave a blue trail.
  - Stats: damage 34-48, 2.2-2.8 swings/s, reach 2.3. Costs about $230 in Cash deathmatch and $460 in Bomb defusal.
  - Appears in Gun Game (now 14 weapons, last in the fixed order) and in the stats.txt weapon tracking.

2.12.34 - Ninja sword blade
  - The blade is now drawn smooth: no dark outlines or gaps between its polygons. The guard, handle and hand keep their outlines.

2.12.35 - Two weapons in Bomb defusal
  - You can now carry two weapons in Bomb defusal. Press 1 or 2 (number row or numpad) or scroll the mouse wheel to swap.
  - Buying a weapon while you only have the starting pistol puts the pistol on your back and equips the new one.
    Once you carry two, a bought weapon replaces the one you are holding.
  - Each weapon keeps its own ammo while stowed; both are refilled at the start of every round. A short draw delay follows each swap.
  - The two slots are shown at the bottom right, with the held one highlighted.

2.12.36 - Barrier on 3D maps, bigger Ninja sword swings
  - Fixed the Barrier power on imported 3D maps. It used to be drawn with the flat maps' camera, so it slid around when you looked up, down or around.
    It now stands on the floor where it was placed, is drawn with the 3D camera and is hidden properly behind walls.
    Shots now only hit it if they pass through its height, so you can shoot over it from above, or at the floor below it.
    Other players' barriers also arrive with their floor height (server.js relays it).
  - Ninja sword slashes sweep much wider (about 50% more arc, reaching the left edge of the screen), lean further into the swing and pull the sword in closer for a more intense swing.

2.12.37 - Shield dispenser power
  - New power, key H: place a shield dispenser, a half-height pylon with a spinning crystal. You and your teammates who walk over it get
    10 shield (up to 50), once every 6 seconds. In modes without teams only you can use it; in co-op everyone can.
  - It has low health (24), so enemies can shoot or cut it down. One at a time. 30 second cooldown to place another, but if an enemy breaks it the
    cooldown is set to 15 seconds.
  - Colour coded: red or blue in team modes (team deathmatch, CTF, Bomb defusal), aqua in the other modes. Allied dispensers show as blue dots on the minimap.
  - Available in every multiplayer mode, including Bomb defusal (buy it under Powers > Abilities, $130). Works on imported 3D maps too.
  - server.js relays the new dp / dph / dpx / dpu messages.

2.12.38 - Shield dispenser is now a real 3D model
  - The dispenser pylon is drawn as true 3D geometry (about 90 polygons) instead of a flat picture that always faces you. It has real perspective,
    looks different as you walk around it, is solid when you look down on it, and walls and corners hide it correctly. Works on the flat maps
    and on imported 3D maps. The crystal on top spins and bobs.
  - Fixed: looking straight at an enemy shield dispenser could break the target readout under the crosshair.

2.12.39 - Medkits are 3D
  - Medkits are now real 3D models, a white first-aid case with red crosses on every side, clasps and a carry handle, slowly turning on the floor.
    They share the same world-space mesh drawing as the shield dispenser, on flat maps and imported 3D maps. Pickup and healing are unchanged.

2.12.40 - Quake hammer rebuild
  - The Quake hammer's head used to float above its handle. The model is rebuilt so the shaft really runs into the head and the whole thing is built and tilted as one piece.
  - More detail (about 385 faces, up from about 60): wrapped grip, glowing pommel stud, steel sleeve and rings under the head, plated head with rune slots, rivets,
    glowing striking faces and eye band, a cap bolt and a crown spike, plus a gloved hand and sleeve. It is also smaller on screen so the head does not fill the view.
  - Swing damage is unchanged (the hammer already hit all around, up to 2.6 away).

2.12.41
- Marksman rebuilt as an M1 Garand-style semi-auto rifle: no scope any more (iron aperture sight with ears,
  front sight hood), top-loaded brass en-bloc clip, operating rod + ejection port, gas cylinder, wooden
  stock/handguard with grain, barrel bands, swivels. ~446 faces (was far fewer; Sniper stays 138).
- New scope-less third-person model for the Marksman so it no longer looks like the Sniper to other players.

2.12.42
- Player and human-enemy model rebuilt. It used to be about a dozen boxes (roughly 50 polygons); it is now about 1,100
  polygons: tapered, jointed limbs (thigh, knee, calf, boot; upper arm, elbow, forearm, hand with fingers), a rounded
  head with jaw, ears, nose, eyes with pupils, brows and hair, a shaped torso with tactical vest, pouches and belt,
  neck and shoulders. Walking now bends the knees. Guns in the third-person model are unchanged.
- The sprite it is drawn into is now 128x128 (was 64x64) so the detail survives up close, with smooth per-polygon shading
  and a thin outline.
- Custom skins still work the same way (front of head, body, arms and legs); the skin preview and template download follow
  the new size.
- Sprites are now built on demand, so spawning many enemies does not cost anything extra up front.

2.12.43
- Player/human-enemy model reproportioned to a more natural human shape: shorter neck, smaller head, longer legs
  (legs are now ~45% of the height, was ~39%), arms and gun re-seated to match.
- Polygon count cut from about 1,100 to about 410 (including the gun) with little visible detail loss: rounder
  limbs are simpler, the vest and finger/knee geometry are gone, eyes/brows/mouth are flat plates.
- Skins, hit zones and sprite size (128x128) unchanged.

2.12.44
- The weapon a player is holding in the third-person model is now the real weapon: it is built from the same model as the
  first-person view (all 14 weapons, accent colour taken from the player's colour), so what other players see you holding
  matches what you are holding. Enemies/humans use Pistol, Scattergun, Rattler or Lance models.
- New natural poses: guns are held two-handed in a bladed stance (torso turned, stock at the shoulder for rifles, arms
  bent with both hands on the gun, head facing the target). Pistols/Hand cannon/Fan gun/Needler are held out in front in
  both hands; Twin fang and Twin daggers have one weapon in each hand; the Reaper axe and Quake hammer are held across the
  body in two hands; the Ninja sword is held up and forward in a ready stance.
- Ninja sword (first-person model) cut from 1176 to about 610 polygons: fewer blade segments and handle wraps, simplified
  guard; the look is the same.
- Third-person models are about 450-690 polygons depending on the weapon (tiny weapon parts are skipped).

2.12.45
- Fixed the Reaper axe in the third-person model: its blade was turned edge-on and showed up as loose fragments; it is
  now rolled so the curved blade is seen in profile on the haft.
- Walking now bobs the body very slightly up and down (about 1.5% of the height) with each step.
- Melee swing animations for other players: Reaper axe and Quake hammer raise overhead and chop forward, the Ninja sword
  winds up and slashes across the body (alternating direction), the Twin daggers stab one after the other. A swing is
  triggered by the attack message the game already sends.
- Visible reload animations for other players: the gun dips and the support hand goes to the belt for the magazine and
  back (two-handed pistols come in towards the chest). Reload progress is now sent with each player's position (new 'rl'
  field; the server relays it), so the animation follows the actual reload time.

2.12.46
- Loot Boxes. In a singleplayer run you earn one Loot Box each time you reach floor 6, 11, 16, 21 and so on (floor 3
  gives none, floor 6 gives one). It is awarded the moment the floor starts, so dying later does not lose it. Boxes are
  not earned in multiplayer.
- New "Loot Boxes" button on the main menu (shows how many you have waiting). The menu shows a rotating preview of your
  character, every hat and cape (owned ones in colour with their rarity, ones you have not found yet as dark
  silhouettes), and an Open button. Click an owned item to wear it (one hat and one cape at a time); click again to take
  it off.
- Each box gives exactly one item you do not own yet, chosen at random from the ones you are missing, so there are no
  duplicates. 15 cosmetics in total: 9 hats (Brodie Helmet, Top Hat, Cowboy Hat, Viking Helmet, Pirate Tricorn, Wizard
  Hat, Royal Crown, Chef Hat, Propeller Beanie) and 6 capes (Hero Cape, Royal Mantle, Vampire Cloak, Forest Cloak, Ember
  Cape, Starfield Cape). When you own all 15 you can no longer open boxes (and no more are awarded).
- Opening animation: the box drops in, shakes harder and harder with light leaking from the seams, bursts open with a
  flash, shockwave and sparks, and the item spins out of it in a beam of light coloured by its rarity, then its name
  pops in. Click, Space or Esc skips ahead. The item is saved the instant you open the box.
- Hats and capes are purely visual (the hit zones are unchanged). Capes sway as the wearer walks.
- Multiplayer: everyone sees the hat and cape other players wear (two new fields, 'hh' and 'hc', sent with the player
  position; the server only relays values that are valid item numbers).
- Your collection is saved on this computer (browser storage key 'ld_loot'). It is not checked by the server, so it
  only decides how you look.

2.12.47
- Shortened the longest texts: the turret, medkit, pylon, smoke, barrier, gravity well and energy shield power
  descriptions, the game-mode blurbs in the lobby (Gun Game, Co-op, Cash, Bomb defusal), the main menu intro, and the
  Settings and Custom map explanations. The meaning and numbers are unchanged.

2.12.48
- profile.txt: your loot boxes, cosmetics (and which hat and cape you wear) and your highest singleplayer floor are now
  also saved in a plain text file called profile.txt in the game's folder (next to the .exe / AppImage; if that folder
  is not writable, the app's data folder is used). The game looks for it every time it starts. To move your profile to
  another version, copy profile.txt next to the new version (replace the file there). If no file exists yet, one is
  created from what the game already has. The file is read at start-up and rewritten whenever something changes.
- Format: one "name = value" per line, # for comments, cosmetics listed by name (for example
  "cosmetics = Top Hat, Royal Crown, Hero Cape"). Names the version does not know are kept in the file, so a profile
  from a newer version is not damaged by opening it in an older one. A file the game cannot understand is ignored and
  left untouched.
- The Loot Boxes menu shows your best floor and has Save profile.txt / Load profile.txt buttons, which also work in the
  browser version (where the game cannot reach the folder by itself).
- Like the loot boxes themselves, the profile is not checked by anyone: editing it only changes how you look.

2.12.49
- profile.txt is no longer plain text: the contents are scrambled and sealed with a checksum, so it cannot be read or
  edited by eye (it looks like a block of random characters, different on every save). The game decodes it itself at
  start-up, so copying the file between versions works exactly as before.
- A profile.txt that has been edited by hand, damaged, or written in the old readable format (2.12.48 only) is not
  accepted: the game keeps using what it has saved itself and does not overwrite that file. The Save/Load profile.txt
  buttons use the same format.
- This only stops casual editing. The game runs on the player's own computer, so anyone determined enough to take the
  game apart can still forge a profile.

2.12.50
- Two new hats in the Loot Boxes: the Stahlhelm (steel helmet with a flared neck guard) and the Knight Helm (black iron
  great helm with a slitted visor and long hair behind it). There are now 17 cosmetics in total. The new hats are added
  after the existing ones, so every existing profile, save and profile.txt keeps working unchanged. Anyone who had all 15
  can earn boxes again until they own the new two. A profile with the new hats opened in an older version keeps them
  (the older version just does not show them).
- New text font (DotGothic16, replacing Pixelify Sans) with clearer numbers. It is loaded from Google Fonts like the old
  one, so it needs internet the first time; offline the game falls back to a plain monospace font.
- Background music: Settings has a new Music section. Paste a YouTube video or playlist link and it plays during
  singleplayer runs (it starts when you roll a run and stops when you go back to the main menu). Needs internet. The
  Tab menu (Run status) has a volume slider; the same slider is in Settings. The link and volume are remembered.
  Videos that their owner has blocked from embedding will not play.
- The music uses YouTube's embedded player (the page's security policy now allows youtube-nocookie.com frames, and the
  desktop app adds a Referer header for it because a local file sends none). This could not be tested against YouTube
  itself here.

2.12.51
- New hat in the Loot Boxes: the Roman Helmet (polished steel with brass trim and rosettes, cheek guards, a flared neck
  guard and a red crest).

2.12.52
- New hat in the Loot Boxes: the Bamboo Hat, a woven conical straw hat with a yellow rim and an orange chin cord. There
  are now 19 cosmetics (13 hats and 6 capes). New hats are added after the existing ones, so profiles and saves are
  unaffected.
- The server now accepts any hat number from 16 to 60, so future hats do not need another server change.

2.12.53
- Added a hidden debug shortcut for testing.

2.12.54
- Spectator mode for multiplayer. In the lobby, every mode now has a Spectators group (shown next to Red and Blue in team
  modes, or next to Players in the others). Pick "Spectate" there, or the host can use "team <player> spec".
- Spectators watch the match without playing: they are not counted in scores, teams or win checks, and nothing they
  send besides chat can affect the game. Everyone sees them in the lobby and on the scoreboard.
- While spectating: E / Q (or click / right-click) switches player, 1-9 picks a player from the list, and Space
  switches between seeing through the player's eyes and hovering behind them (mouse to orbit, wheel or - / = to zoom).
- Spectators can use All chat (shown with a [Spec] tag) but have no Team chat and do not see it.
- Players now also send which way they are looking up or down, so a spectator's first-person view matches theirs.
- The host cannot spectate in co-op (the host runs the monsters). Spectating is chosen in the lobby; players who join a
  match that is already running join as players.

2.12.55
- New scoreboard (Tab) in multiplayer, laid out as one table per team with a big team score on the left and your own row
  highlighted. Columns are Kills, Deaths, Assists, K/D and Ping; Bomb defusal shows Kills, Deaths, Plants, Defuses and Ping.
  There is no score column. Matches without teams show a single Players table, and spectators are listed underneath.
- The server now counts assists (hurting a player shortly before a teammate or rival kills them), plants and defuses.

2.12.56
- Power stacking is clearer. When a power on offer is one you already have, its card shows "x2 > x3" and the total you
  would have afterwards (for example Light boots: +14% now, +18% offered, total +32% base move speed). The Tab screen
  and shops show your stacked totals too.
- Abilities you trigger with a key can only be held once and are no longer offered a second time: Phase dash,
  Chrono bubble, Shock nova, Barrier projector, Blink step, Sentry turret, Field medic, Gravity well, Smoke bomb and
  Shield dispenser. So are Aegis, Adrenaline, Ember rounds and Cold snap, which a second copy would not change.
  Shops show them as "(owned)" and will not sell a second one.
- Sentry turret and Smoke bomb no longer mention extra copies in their descriptions.

2.12.57
- Phoenix heart: you can only hold one at a time. While you have an unused one it is not offered or sold; once it has
  saved you, it can be found again.

2.12.58
- Bomb defusal: if you die in a round you lose your weapons and powers and start the next round with the default pistol.
  If you survive, your gear carries over (health is restored to full at the start of each round, as before).

2.12.59
- Boss floors are rarer: besides every 5th floor (still guaranteed), a floor has a 15% chance to be a boss floor
  (was 35%).
- New level: the Coliseum. About 6% of floors after floor 1 (single player and co-op, not the map picker) are a Roman
  arena: a big open sand circle with an arcaded two-tier wall, columns, gates with torches, a tiled centre medallion,
  blood-stained sand and 6-8 random pieces of stone cover. It is always a boss floor with a boss plus three minions,
  and you start at the south gate.
- New boss: the Knight, a huge full-plate humanoid with a greatsword (Hollow/Gilded/Ashen/Iron/Crimson Knight, Champion,
  Warden or Paladin). It does not spawn other enemies. Three telegraphed attacks: Overhead slam (damage plus a fan of
  shockwave bolts), wide Sweep, and a straight-line Charge that stuns it if it hits a wall. Below half health it is
  faster and attacks sooner. Every boss floor (including the Coliseum) is a 50/50 pick between the Knight and the
  original Summoner boss.
- The Knight has its own 3D-rendered model and animations (idle, walking, slam, sweep, charge) and works in co-op.

2.12.60
- Looking up and down on the built-in levels no longer breaks the picture. The old renderer drew the view flat and then
  slid the whole image up or down, which smeared the top and bottom edges and cut the sky; it now draws with the tilted
  view directly, the same way imported 3D maps do, and enemies, props and effects stay planted on the floor. This also
  removes thin black seams between floor tiles and at the bottom of walls. Level layouts and how they play are unchanged.
- Coliseum: the stands now have five rings of stepped seating (red and gold seats) around the arena, with the arcaded
  outer wall rising behind them and gateways cut into the stands at the four compass points. The seats are scenery you
  cannot walk onto. The arena is a little larger in total (a 40x40 map) but the open sand area is the same size.

2.12.61
- Coliseum: the outer wall is a little lower and the stands are bigger. There are now eight steeper rings of seating
  (the seat rows are also painted on the stand fronts), reaching higher and further back, and the arena floor is a bit
  smaller (about 21 wide) so the stands are closer and easier to see.

2.12.62
- Coliseum: the stepped seating is gone. The seats are now painted on the arena wall itself (rows of benches with
  spectators in red, gold and plum seats), with a small stone barrier running around the arena in front of them. The
  arena floor is back to its larger 26-wide size. The wall is still slightly lower than before (1.8 tall).

2.12.63
- Coliseum: the seats are no longer painted flat on the wall. Three rows of stepped seating with spectators (red, gold
  and plum seats) rise back and up against the arcaded wall, with a small stone barrier in front of the first row. The
  stands and barrier are scenery you cannot walk onto, and the gateways cut through them. The wall behind is the
  arcaded wall again, slightly lower than the original.

2.12.64
- Coliseum: the barrier in front of the stands is taller (chest height) and the three seat rows start higher and rise
  higher, so the stands clearly look out of reach. The wall above them was raised a touch to keep the arcade showing.

2.12.65
- Coliseum: a skyline of tall, slender brick towers (in the style of medieval Bologna) now stands in the sky behind the
  arena, with crenellated, pyramid-roofed and capped tops, narrow windows and a haze that fades the far ones into
  the sky. It is a flat backdrop that turns with your view and is drawn only on the coliseum level.

2.12.66
- Coliseum: the skyline goes back to the earlier look, with fewer, wider and shorter brick towers in a soft haze,
  instead of the slender ones from 2.12.65.

2.12.67
- Coliseum boss intro: the north gate now opens at the start of the floor. The gate plate grinds up with a rumble and
  screen shake, then the boss strides out of the passage into the arena while its health bar slowly fades in under
  cinematic black bars. You can't move or shoot during it (about 6 seconds); Space or Enter skips it.
- Epic orchestral boss music, started when the intro ends. It is synthesised live in the browser (no audio files, no
  internet): layered detuned string pads and a driving staccato string ostinato, cello/bass, brass stabs and a
  brass theme, a formant "choir", taiko drums, snare rolls, cymbal crashes and reverse swells, over a 16 bar D minor
  loop that builds in intensity. Killing the boss plays a D major victory fanfare; dying or leaving fades it out.
  Your YouTube music is paused for the fight and resumes after, and the fight music follows the music volume setting.
- Multiplayer: the walk-in cutscene is single-player only for now (so host and guests stay in sync); in co-op the
  boss music still plays from the start of the floor.

2.12.68
- Coliseum floors are now fixed: floor 5 and floor 10 are always the coliseum (and the coliseum can no longer show up on
  floors 1-4 or 6-9). Past floor 10 it still turns up at random (about 6%).
- The Knight is the guaranteed boss on the floor 5 and floor 10 coliseums. On random coliseums past floor 10 the boss
  is still 50/50 between the Knight and the other boss type.
- Floor 10 Knight, stage 2 (below 50% health): he roars, shockwaves you away and his armour turns blackened steel with
  molten orange trim, spikes, a purple cloak and a glowing aura, with embers streaming off him. He moves 25% faster,
  his sword attacks leave a glow and he hits 10% harder (the health bar also turns orange).
- New attack: a few lumps of low-poly rock sit around the arena like scenery on floor 10. Not long after the
  transition he runs to the nearest one, picks it up, holds it overhead and hurls it at where you are standing. It takes
  about 1.8 seconds to land, so you can dodge it; a direct hit does around 1.25x his normal damage. Rocks he has used
  are gone, and he stops throwing when none are left.
- Stage 2 and the rocks are single-player only for now (online co-op would need the thrown rock synced to guests).

2.12.69
- Floor 10 Knight fight: when he enters stage 2 the music escalates. The tempo picks up, a crash and drum hit land on
  the roar, and the track jumps to the full brass theme with a pipe organ added, fast tremolo violins, extra taiko and
  snare ghost notes. It stays at that intensity until the fight ends.

2.12.70
- Co-op: the floor 10 Knight's stage 2 now works online. Everyone sees the roar and the armour change, the embers and
  glowing sword, the faster Knight, and the same rocks lying in the arena. When he picks one up it vanishes for
  everyone, and the thrown rock flies and lands for each player, who can dodge it. server.js was updated to relay
  this (the host's server and every player must be on this version).
- New hat: Ashen Knight Helm (Legendary). Beat the floor 10 Knight, in single player or co-op, and you unlock his
  stage 2 helm with the glowing visor, molten spikes and spiked pauldrons. It can't come out of a Loot Box, so a
  collection can show as one short until you beat him. It is saved in your profile like the other cosmetics.

2.12.71-72
- Loot Boxes screen: the secret floor 10 hat's picture is a "?" until you unlock it (its name is a "?" too; how to get it still shows).

2.12.74
- Ashen Knight Helm redone to match the Knight's stage 2 helmet exactly: rounded dark steel helm, glowing magenta visor,
  orange trim bands and vents, three horns, a purple plume at the back and the round pauldrons with orange rims and spikes.

2.12.75
- Coliseum is now a selectable map in multiplayer (host's Map menu, or the host console "map coliseum"): classic,
  team, Brighton, cash, gun game, bomb defusal and co-op. Capture the flag still needs the CTF map.
- Spawns: in team modes one team spawns along the north side of the arena and the other along the south side, facing
  the centre. In free-for-all modes you spawn on the sand at a random point, picking the one farthest from enemies.
  Bomb defusal uses its usual attacker/defender spawn zones. In deathmatch modes there is no boss and the north gate
  stays shut. In co-op the coliseum map has the Knight/boss fight on every floor with the gate-opening intro.
- server.js needs updating too (it knows the new map name).

2.12.76
- Capture the flag now works on the Coliseum map. The red team's flag sits at the north end of the arena and the blue
  team's at the south end; each team spawns around its own flag. Grab the enemy flag and bring it back to your own
  flag while it is at home, as on the CTF map. Pick CTF mode and the Coliseum map (host menu or the "map coliseum"
  console command). Update server.js too.
- (Deathmatch modes on the Coliseum have never had enemies or a boss; only co-op does.)

2.12.77
- The loose text across the top of the screen is now one compact info box in the top left. It shows the floor or mode
  and score (kills, team scores or flag captures), the flag status in CTF, and your weapon. Kills/deaths and ping
  are gone from it (they are on the scoreboard). The kill / event feed sits in small boxes right under it so it no
  longer overlaps the flag text. The boss health bar is slightly narrower to leave room for the box.

2.12.78
- Safety: a boss can now never be created in the player-versus-player modes, whatever the floor number (it already
  didn't happen in normal play).

2.12.79
- The game is now called Arberia Deathmatch (it was Loaded Dice): window and title screen, built file names
  (ArberiaDeathmatch.exe / ArberiaDeathmatch.AppImage), scripts and docs. Your saves, settings and profile carry over:
  if you already have the old "Loaded Dice" data folder (%APPDATA%\\Loaded Dice on Windows) the game keeps using it.
  The old LOADEDDICE_NOGPU / LOADEDDICE_NOSANDBOX variables still work next to the new ARBERIA_NOGPU / ARBERIA_NOSANDBOX.

2.12.80
- Title screen: the explanation text under the name is gone, leaving just the name and the buttons.

2.12.81
- Sniper scope: ADS zoom now magnifies everything, not just the walls' width. Enemies, walls and floors scale up vertically too, so targets look bigger (and head zones are easier to hit) when scoped. Aim, hit detection and name tags line up with the zoomed view. Sprites are magnified equally in width and height (no vertical stretching).

2.12.82
- New multiplayer mode: Infection. Everyone spawns as a human with a random weapon. 10 seconds in, the server picks a random player to become the first zombie. Zombies have only their hands (a new "Zombie hands" weapon, fast and 18% quicker to move) and must be right on a human to touch them: a hit turns the human into a zombie instantly, with no damage. Humans can shoot zombies (zombies respawn as zombies) but cannot hurt each other. Humans win if at least one survives 3 minutes after the outbreak; zombies win when nobody is human. Humans who die any other way are infected too, and players who join mid-match join as zombies. Needs at least 2 players.
- Zombies look green (own first-person claws, green skin and arms-out pose for other players, green name tags), the match shows a small HUD box (role, countdown, humans left) and the scoreboard tags zombies.
- Server: "mode infection" console command; the timer, who is a zombie and who wins are all decided by the server.

2.12.83
- Infection: zombies now have a green tint over their skin and clothes (hats and capes keep their own colours; custom skins stay but get tinted), hold their arms straight out in front of them, and their name tag reads ZOMBIE.
- The Reaper axe is now drawn as a scythe (long shaft, curved crescent blade), in your hands and on other players. It still plays the same.
- Respawn time in PvP modes doubled (3s to 6s; Bomb defusal still has no timed respawn) and a "Respawning in N" countdown shows while you are down.
- Kill cam: while you are dead you watch through the eyes of the player who killed you (live, with their movement and shots) instead of a red screen. In Bomb defusal it shows for the first 5 seconds. Falls into the normal death screen if the killer left or you had no killer.

2.12.84
- Fixed the scythe: the blade is now attached to the top of the shaft (it was floating beside it), in your hands and on other players.

2.12.85
- Scythe: the blade now sits right at the top of the handle (it was a little low), the weapon is held higher in view, and it has its own swing: a wind-up to the right, a wide slash across to the left, then back to rest.

2.12.86
- Crouching: hold Left Ctrl. You move 50% slower, your aim spread is 15% smaller, and your eye drops lower (it also lowers your hit box a little, so shots that used to hit your head now go over it). Other players see you in a new squatting pose in every mode. In a web browser Ctrl+W closes the tab, so crouch before you start walking back, or play in the desktop app.

2.12.87
- Crushers moved from the Lab floors to the Foundry floors.
- New Lab-only enemy: the Acid Bot, a low-poly 3D robot on wheels. It has no powers or traits and spits green acid that leaves a pool on the floor; standing in a pool deals damage over time. Singleplayer only (co-op and multiplayer do not spawn it).
- Settings > Controls: rebind movement, jump, reload, use, crouch, dash, every power and the shop. Binding a key already in use swaps the two. Reset button restores defaults. Saved on this computer. Mouse buttons, Esc, Tab, Enter and arrow keys cannot be bound. Power descriptions in menus still show the default letters.

2.12.88
- Defuse mode: new sounds for planting the bomb (thud, three beeps, rising tone) and defusing it (rising chime). You also hear ticking while you hold F to plant or defuse. The bomb's countdown beeps and the explosion are louder up close and fainter far away.
- Sounds in general now get fainter with distance and pan left/right toward where they come from: other players' shots, enemy deaths and special attacks, crushers, falling rocks, turrets, deployed markers and the bomb. Your own weapon, hit and damage sounds stay at full volume. Enemy gunfire is still silent, as before.

2.12.89
- The version number is now shown in the bottom left of the title screen. Release zips are named with the version.

2.12.90
- Loot Boxes menu: set your player name once. It is used automatically when you join or host a multiplayer match and is saved in profile.txt (and in the browser). Changing the name box in the Multiplayer menu also updates it. Names are up to 16 characters.

2.12.91
- Multiplayer lobbies: click a player's name to open their profile popup (name, how many cosmetics they own, highest floor reached, and their profile background if they set one).
- Loot Boxes menu: new "Customize Profile" button (top right). The custom skin upload moved there from Settings. You can also upload a profile background (PNG or JPG, 2MB max; it is shrunk to 400x225). It is shown blurred, dulled and darkened behind the popup text so it stays readable.
- The profile numbers are sent by your game when you join, so a modified game could report different numbers. The background is stored in the browser/app storage, not in profile.txt.

2.12.92
- New Settings > Debug > "Debug mode" checkbox (off by default). The developer options (extra buttons and testing shortcuts) only work while it is on.
- The Customize Profile button moved from the Loot Boxes menu to the main menu, between Loot Boxes and Settings.

2.12.93
- Pause menu: press Esc while playing (singleplayer or multiplayer) for Resume, Leave (Main Menu) and Close Game, over a see-through dark backdrop. Esc again closes it. In singleplayer the game freezes while it is open; in multiplayer the match keeps running, so you are still in the game while paused. Close Game quits the desktop app (a browser tab cannot close itself and tells you to close it).

2.12.94
- New power: Frag grenade (N, rebindable). Hold N to cook the 3.5 second fuse (a bar and countdown show on screen), release to throw. It is thrown the way you are looking, falls, bounces off walls and floors and rolls to a stop, then blows up for up to 130 damage in a 3.4 tile radius (less with distance, blocked by walls). It hurts you too, and if you hold it until the fuse runs out it explodes in your hand. 14 second cooldown. Works in singleplayer and every multiplayer mode (not during the Defuse freeze time). It is a small 3D poly model that tumbles through the air. Other players see it fly and hear it; the thrower's game works out who it hurts.

2.12.95
- Fixed the dust2 fall-through. Two causes: (1) a wall brush standing on a terrain strip near the spawn was thrown away as if it were terrain, so the wall was drawn but you could walk through it into empty space; the importer now only drops the brush that actually carries the terrain. (2) The collision test for terrain triangles could miss a player standing exactly over thin seams between nearly axis-aligned triangles (found at one spot on the T-side floor); the test is now scale-correct. A scan of about 200,000 walk-and-drop samples across the reachable map now finds no way out (it found 46 before). This fix applies to all imported maps.
- The music volume slider moved from the singleplayer Tab status screen into the Esc pause menu (it shows whenever the map has music, in singleplayer and multiplayer).

2.13.0
- Texture quality setting (Settings > Graphics): Classic or Enhanced. Classic is the original 64x64 textures, untouched. Enhanced makes every built-in surface texture 128x128 with relief lighting on joints and bumps, crevice shading, crisper edges, fine grain and slow colour mottling: dungeon, cavern, lab, crypt, manor and foundry walls and floors, bridges, hazard panels, the coliseum, the city facades, roads and pavements, Capture the Flag walls and pads, and the generic surfaces of imported maps. It takes effect when the next floor or match loads, is remembered between sessions, and does not affect multiplayer sync (each player can pick their own). Enhanced costs a little more memory and about 50-100 ms extra when a floor loads; drawing speed is about the same.
- Real textures read from your own game files for imported maps are not changed.
- New app icon: a gold AD monogram on a crimson tile replaces the default Electron icon (window, taskbar, installer and the browser tab). Files are in the build folder (icon.ico and icon.png).

2.13.1
- App icon redesigned: a plain retro pixel-art AD on a dark blue (top), white (middle) and dark green (bottom) tile, replacing the glossy gold one.

2.13.2
- Steam invites and Steam Networking. Add the game to Steam (Games > Add a Non-Steam Game to My Library > browse to ArberiaDeathmatch.exe or the AppImage) and start it from Steam. Host a game, then press "Invite Steam friends" in the lobby: the Steam overlay opens, you pick friends, and they accept the invite while the game is running (also started from Steam). Their game connects through Steam's relay, so no port forwarding, IP address or VPN is needed. Typing an address still works as before.
- How it works: the host's normal game server is untouched; each Steam player's connection is tunnelled through Steam packets (steam.js). Without Steam, nothing changes.
- Steam is only switched on when the game is started from Steam (or with --steam, or "steam": true in settings.json in the app's data folder; "steam": false turns it off). Steam must be running. A non-Steam game has no AppID of its own, so Steam is initialised with the shared test AppID 480 ("Spacewar"): friends will see you as playing Spacewar, and an invite can only be accepted by a friend who already has the game running. Set "steamAppId" in settings.json to use a different ID.
- Needs the steamworks.js package (listed as an optional dependency, installed by npm install / the BUILD scripts). If it is missing the game just runs without Steam.
- Players who join through Steam all arrive at the server as 127.0.0.1, so the "ban by IP" console command cannot single them out; kick still works.

2.14.0
- Frame rate is now locked to 60 FPS for everyone (it used to draw as fast as the screen allowed, so 120/144/240 Hz screens ran the game flat out). Works on any refresh rate.
- Benchmark (debug mode only: Settings > turn on debug mode, then a Benchmark button appears at the top left of the main menu). It plays a 60 second tour on its own: dungeon, cavern, lab, crypt, manor, foundry, mineshaft, city and coliseum floors with an autopilot player fighting monsters, the status screen, pause menu and loot box menu, then Classic, Team, Capture the Flag, Gun Game, Infection and Bomb defusal matches against humanoid bots. A live FPS counter sits at the top left. At the end it shows the average FPS, how long the frame rate was below 40 FPS, the lowest FPS, and a per-scene table. "Time below 40" and "Lowest" are measured over quarter-second slices so normal screen-refresh judder is not counted. Esc stops it. It does not touch your saved profile (floor record, loot boxes) and is silent. Scene loading time is not counted.

2.14.1
- Kill cam is now a real replay: after you die you watch the last few seconds before the kill from the killer's eyes (with a figure standing in for you), looping until you respawn. If there is no footage of the killer it falls back to the old live view.
- Opening the scoreboard with Tab in multiplayer no longer opens the pause menu.
- Your name moved from the Multiplayer menu to Customize Profile. It is saved in your profile file (profile.txt) as before.
- Ninja sword range reduced by 15%.
- Below 50 health a slight bloodshot effect (red edges with faint veins) appears around the edges of the 3D view. It is drawn under the HUD, so it never covers the interface, and grows as health drops.

2.14.2
- Fixed the Frag grenade (N) doing nothing in single player and multiplayer: its cooldown was never set up at the start of a run, so the throw was always blocked.
- Melee weapons: the crosshair is red when no enemy is in reach and green when one is in range of your swing.
- Twin fang now fires its two guns alternately (left, right, left...) with a muzzle flash and recoil on the firing gun. Damage and ammo use per second are unchanged.

2.15.0
- Bots: the host of a multiplayer lobby (hosting from the desktop app) can now Add bot / Remove bot in the lobby (up to 12) and pick their skill (Easy / Normal / Hard). Bots work in every mode except Co-op, which has no bot controls and the server refuses bots there.
- Bots move around the map (including imported 3D maps), shoot, buy/pick weapons, and play the objectives: they capture flags in CTF, plant/defuse the bomb in Defuse, hunt/flee in Infection and climb the gun ladder in Gun Game.
- Bots appear in the player list tagged (bot). Matches that include bots are not counted in weapon statistics.
- Bots run on the host's game, so they stop if the host leaves.

2.15.1
- Fixed "Leave (Main Menu)" from the pause menu appearing to freeze the game: the main menu was built but stayed hidden. It now shows the main menu properly (single player, multiplayer and hosted games).

Patches for friends (added with 2.15.1, no game changes)
- BUILD-FOLDER.bat builds the game as a normal folder (dist\win-unpacked, play with "Arberia Deathmatch.exe") instead of one portable exe. Zip that folder and send it ONCE.
- Simplest: after building a new version, just run  node tools\make-patch.js  (no arguments). It uses the last 20 versions saved in tools\history, so the one patch.exe updates a game from any of them, and then saves the new version there for next time. (Patch is ~2-3 MB.)
- Manual alternative: make a small patch.exe: install Go (https://go.dev/dl), keep the source folder of the version your friends currently have, then run
      node tools\make-patch.js <path to the OLD version source folder>
  in the new version's folder. You can list several old version folders (node tools\make-patch.js <old1> <old2> ...) and the one patch.exe then updates a game from ANY of them: it carries every file changed since the oldest, and only replaces files that differ. It writes patch-<old>-to-<new>.exe (a couple of MB). Friends put it in their game folder (or run it and paste the folder path) and double-click. It checks they have exactly the old version, backs up the replaced files (resources\app-backup-<old>) and updates only the changed files.
- A patch only covers game files. If a new version changes npm packages (package.json dependencies) or the Electron version, send the full folder again.
- Windows may show an "unknown publisher" warning for patch.exe: More info -> Run anyway.

2.16.0
- First version of the Station map (flat, single level). Replaced in 2.16.1.

2.16.1
- The Station map is rebuilt as a real 3D map, laid out like Nuketown: a red habitat module on the west and a blue one on the east, each TWO STORIES with stairs inside, rooms, doorways, upstairs windows over the yard, and a back lane around each module. Between them is the docking deck with a shuttle in the middle, cargo crates you can hop up on, low barriers and glowing fuel-cell pillars. The whole hangar is enclosed, with a long panoramic window on one wall looking out at space and the planet.
- It has its own textures (hull panels with team colours, deck grating, hazard stripes, cargo crates, shuttle hull, consoles, ceiling lights, stairs, a starfield window) and is built in code, so everyone gets the identical map and nobody needs a map file.
- Pick "station" in the lobby's Map list. It works in every mode except Capture the flag. Team modes spawn each team in its own module. Bomb defusal has two sites: inside the blue module's ground floor, and the east side of the yard. Bots can use it.

2.16.2
- The Station map is no longer available in Co-op (it is not a single-player level). Switching a lobby to Co-op moves it off Station, and the server refuses it.
- Multiplayer chat now announces joins: "John joined the game", with the name in bold.

2.16.3
- Multiplayer chat now also announces leaves: "John left the game" (name in bold), including players who are kicked or disconnect. Bots do not trigger join/leave messages.
- Mini-map: you are now a pointed arrow showing which way you are facing. In multiplayer, your teammates (and everyone in Co-op) also show as small arrows pointing the way they face, in their team colour. Enemy players are never shown.

2.16.4
- Mini-map markers are smaller: back to the small square (you in white, teammates in team colour) with a little triangle point on one end showing which way they face.

2.16.5
- Station map performance: the map no longer builds faces nobody can see (faces buried against other blocks, outside the hangar, or above head height), which halves the triangles per frame (about 1900 to 1050). Faces pointing away from you are skipped, and the rest are drawn nearest-first so hidden pixels are rejected early. In a headless test the map's frame time dropped from about 9.9 ms to 5.1 ms with no visible change to the picture.

2.16.6
- Imported maps (Source / Quake 3 .bsp) draw faster: flat surfaces that face away from you are skipped, and the visible ones are drawn nearest first so hidden pixels are rejected early. In a headless test, a large map (ctf_2fort) went from about 20 ms to 13 ms per frame and de_dust2 from about 6.8 to 6.2 ms, with the picture unchanged (under 0.1% of pixels differ). Moving parts (doors, lifts), see-through surfaces and Minecraft worlds are not affected.

2.16.7
- Settings > Debug no longer describes the debug shortcuts, and they are no longer written out in the README.

2.17.0
- Single player: enemies get 5% more health and deal 5% more damage on every floor, on top of the existing scaling (floor 1 is unchanged, floor 11 is about 1.6x, floor 21 about 2.6x). Bosses scale too. Multiplayer and Deathmatch modes are not affected.
- Blinking enemies can no longer teleport out of bounds: the landing spot must be inside the map and reachable in a straight walkable line (no jumping through walls, onto another level, or off the edge).

2.17.1
- Enemies find their way to you instead of grinding against walls: when they have no clear line to you (or get stuck on a corner) they follow a route around obstacles, on the flat maps, Station and imported 3D maps. In a headless test on Station, enemies that reached the player within 60 seconds went from about 5 of 8 to every one; on dungeon floors the only ones that failed were in areas with no walkable connection to the player.
- Enemies that get wedged against something now back off and try another way around.
- Enemies only chase you after they have seen you. Enemies created mid-fight (summoned or spawned) no longer start already hunting you.
- Enemies on 3D maps are no wider than the player, so they fit through the same gaps.

2.17.2
- Knight boss (floors 5 and 10, and any other floor he turns up on): walks 30% faster; his charge is 50% faster and carries 30% further; his shockwave bolts fly 50% faster (the thrown rocks are unchanged).
- He is always named Crimson Knight, and the floor-10 version Ashen Knight.
- On floors 5 and 10 you now start in the middle of the arena during the boss cutscene, so you begin closer to him.

2.17.3
- Settings > Graphics: with Hardware (GPU) rendering on, Windows now has a "Graphics API" choice: Automatic (DirectX 11, as before), DirectX 11, OpenGL or Vulkan. This is the backend that puts the picture on screen; the 3D itself is still drawn by the game in software. Changing it restarts the game, and if hardware rendering fails the game falls back to software as before. The Settings line also shows which API is running.

2.17.4
- Deleting profile.txt now gives you a brand new profile (no loot boxes, cosmetics or best floor, and a new random name) instead of the game rebuilding the old one from its saved copy. If the new file cannot be written (a read-only folder, say), your existing progress is kept. To keep a profile when moving to a new game folder, copy profile.txt across before starting.

2.17.5
- Kill replays and the live kill cam now show what the killer had: their weapon in first person (with a kick when they fire), the bullet streaks and muzzle flashes of their shots, and their health in the HP box (your own ammo is hidden during the replay).

2.17.6
- Kill replays now also show the hit markers the killer saw: the crosshair flash on every hit, and HEADSHOT / LEG SHOT with the gold crosshair, including hits on other players during those seconds. This only appears inside the replay. To make that possible the server now passes the hit zone along with each hit and tells the other players about it (stored for replays, never shown live), so every player in a match needs this version.

2.17.7
- Leaving a singleplayer or multiplayer game (and being disconnected) now shows the plain black menu background instead of the last frame of the match behind the menu.

2.17.8
- Multiplayer host: the pause menu has a new "Send everyone back to lobby" button (click twice to confirm). It ends the match for everyone and returns the whole lobby to the lobby screen, the same as the existing Back to lobby button on the results screen. Other players do not see it.

2.18.0
- Play of the Game: at the end of every multiplayer match (not co-op), everyone watches a 6 second clip of the best moment before the results. The best moment is the 6 seconds in which one player dealt the most damage, counting only stretches that include at least one kill; healing a teammate (not yourself) with your medkit counts as 50 per heal. The clip plays from that player's point of view, with their weapon, bullets, health and hit markers (the same replay used for kill replays). Space, Enter or a click skips it.
- To make this work the server now tracks damage and healing in a rolling 6 second window and tells everyone when a new best appears, so every player in a match needs this version. Kill replays also got a longer recording buffer and now include your own shots.

2.18.1
- Fixed all non-player enemies being invisible (a bug from the 2.17 pathfinding change that shrank their sprites to nothing).

2.18.2
- Defuse: after your kill replay has played once, you now spectate your living teammates for the rest of the round (never enemies). Q / E, the arrow keys, or left / right click switch between them; if no teammate is left alive you just stay on your own death view. The next round puts you back in as normal.
- Note for Linux players: the Windows patch exe does not apply to Linux, so Linux players have to rebuild from the full zip (./BUILD.sh) to get new versions. Everyone in a match needs the same version for Play of the Game to show.

2.19.0
- Station map: gravity is now 50% of normal.
- Sniper: the scope now has a small amount of sway. Hold LEFT SHIFT while zoomed in to hold your breath and steady it: you can hold for 2 seconds, then there is a 2 second cooldown before you can again (a small bar next to the crosshair shows your breath).
- Because Shift is now the hold-breath key, Phase dash moved to J by default. Both can be rebound in the key settings (a custom Phase dash binding you already set is kept).
- Kill replays and Play of the Game now show the player zooming in with a scope (the scope view and the zoomed field of view) as they did it.
- Spectating (including watching teammates after you die in Defuse) now shows the person's gun in first person and their scope when they zoom in.
- To show zoom to other players, the server now relays each player's zoom amount, so everyone in a match needs this version.

2.19.1
- Infection: a human now has to be hit by a zombie twice before they are infected. The two hits just have to happen at some point in the match; they can come from different zombies and any amount of time apart. The first hit gives a hurt flash but does not infect. Dying to anything else still turns you into a zombie right away. The count is kept by the server, so the host needs this version.

2.19.2
- Bots no longer wear hats or capes.

2.20.0
- Blood splatter: when you take damage, blood now lands on the walls and the ground around you, mostly on the side the hit came from (more damage means more splatter). It works on every map, including the 3D ones.
- Hitting something now has a punchier sound: a low thump, a sharp crack and a short noise slap, with an extra high ping on headshots.

2.21.0
- Custom sprays: Customize Profile has a new "Custom spray" section. Upload a PNG or JPG (1MB max); it is fitted into a 100x100 image (the whole picture is kept, empty space stays transparent) and saved on your computer. In a match (or a singleplayer run), face a wall within about 3 tiles and press K (rebindable in Settings > Controls) to spray it. Every player in a multiplayer match sees your spray. Each player has one spray on the wall at a time (a new one replaces the old one), it lasts about 2.5 minutes, and you can spray once every 2.5 seconds.
- Only a small checked PNG is ever sent (once, when you join), and each spray after that only sends a position. The server needs this version for sprays to reach other players.

2.21.1
- Sprays are now painted flat on the wall instead of floating as a camera-facing picture: they stay fixed to the wall as you move, shrink and angle with it, and are hidden by anything standing in front of them. The server relays the wall direction with each spray, so everyone in a match needs this version.

2.22.0
- New mode: Arms Race. Like Gun Game, but played in rounds and the ladder runs the other way: you start with the best weapon (Sniper) and work down through Marksman, Rattler, Hand cannon, Lance, Scattergun, Twin fang, Fan gun, Needler, Pistol, then the melee weapons Ninja sword, Reaper axe, Quake hammer and finally Twin daggers.
- Every kill moves you one weapon down the ladder. The first player to get a kill with the last weapon wins the match.
- When you die you are out until the round ends (you can spectate the players still alive). A round ends when only one player is left, or after 90 seconds, then everyone respawns and the next round starts. Levels carry over between rounds. Bots play it too.
- Everyone, including the server, needs this version to play Arms Race.

2.22.1
- Weapon balance: Scattergun damage falloff range +75%. Fan gun falloff range +30%. Rattler and Needler damage +25%. Twin fang magazine +25%. Pistol damage -5%.
- Ninja sword: damage -40%, swing rate +10%.
- Reaper axe: damage +10% and the swing arc is twice as wide.
- Twin daggers: movement speed bonus raised from +15% to +20%.

2.22.2
- Scattergun damage +25%.

2.22.3
- Scattergun damage +25% again, and its damage falloff range -10%.

2.22.4
- Ninja sword damage +15%. Marksman damage -5%. Sniper damage is 15% lower on anything but a headshot.

2.22.5
- Sniper damage on anything but a headshot reduced by another 15% (now 27.75% lower than before 2.22.4).

2.22.6
- Scattergun: spread +20%, damage falloff range -10%, damage +10%.

2.22.7
- Crouching now shrinks your aim spread by 20% instead of 15%.

2.23.0
- The game window now takes the aspect ratio of the resolution you pick in Settings (for example 16:9, 16:10 or 4:3). It keeps its width, changes its height to fit, stays on your screen, and keeps that ratio while you drag its edges, so there are no black bars. Maximized and fullscreen windows are unchanged. This is for the desktop app; in a browser the window size is up to the browser.

2.23.1
- New 9:16 (portrait) resolutions in Settings: 360 x 640, 540 x 960, 720 x 1280 and 1080 x 1920. The window takes the portrait shape too.
- On narrow screens the top-left info panel shrinks to fit and the minimap sits below it instead of overlapping it. Wide screens look the same as before.
- The window can now be made smaller than before (minimum 320 x 320) so tall portrait windows fit on short screens.

2.24.0
- New Window mode setting (Settings > Video > Display): Windowed or Borderless fullscreen. Borderless fullscreen fills the whole screen with no frame or title bar, and is remembered the next time you start the game. F11 still toggles it. In a browser it uses the browser's own fullscreen.
- The Settings menu is now sorted into sections that open and close when you click their heading: Video (Display, Graphics, Rendering), Controls, Audio, Textures and Developer. Everything starts closed, and the game remembers which ones you left open.

2.24.1
- The multiplayer lobby is laid out in two columns on wide windows, so it no longer needs scrolling: connection info and teams on the left, mode, map, bots, import and chat on the right, with Start match and Leave in one row underneath. Narrow windows still stack it in one column.
- The lobby now describes Arms Race (it had no description before).

2.25.0
- Lobby host tools: the host can drag a player onto the Red, Blue or Spectators box to move them, or right-click a player to move them or kick them (kicked players can rejoin). Works on bots too. Only the host can do this, and only in the lobby (kicking also works during a match from the host console). The server needs this version for it to work.

2.26.0
- Powers that need a key to activate (Phase dash, Chrono bubble, Shock nova, Barrier projector, Blink step, Sentry turret, Field medic, Gravity well, Shield dispenser, Smoke bomb, Frag grenade) are now bound by the order you get them, not to fixed letters. The first one is on E, then Z, X and C. The first Smoke bomb or Frag grenade you get is on G instead (a second grenade takes the next free letter).
- You can hold at most 4 key-activated powers (grenades count). Once you have 4, no more of them are offered; stat and passive powers are unaffected, and you can still stack extra copies of ones you already have.
- The key letter shows next to each ability's cooldown bar on the HUD and next to the power in the pause menu. In Settings > Controls the individual power keys are replaced by Ability 1 to 4 and Grenade, which you can rebind. Old per-power bindings (such as J for dash) no longer apply.

2.26.1
- Settings > Controls has a new list of overrides, one row per key-activated power. Click a row and press a key to pin that power to it (for example Sentry turret on T). An overridden power uses only its own key and no longer takes one of the automatic keys (E, Z, X, C, G), so the other powers move up. Backspace sets a power back to Automatic. A key that is already used for something else is refused with a message. Reset controls to default also clears the overrides.

2.26.2
- Multiplayer scoreboard: a red X appears in front of a player's name while they are dead (waiting to respawn, or out until the next round in Bomb defusal, Arms Race and similar modes). It is not shown on the end-of-match results.

2.26.3
- Capture the flag scoreboard: the Assists and K/D columns are now Captures and Returns (flags you captured and flags you returned to base).
- Infection scoreboard: Assists is now Infections (how many people you infected).
- When the host sends a multiplayer match back to the lobby, the lobby now shows the normal blank background instead of the last frame of the match.
- The server needs this version to track captures, returns and infections.

2.26.4
- Infection: infecting a human no longer counts as a kill. Kills are only for humans who kill zombies; infections are tracked separately in the Infections column.
- The server needs this version for the change to take effect.

2.27.0
- Debug mode: new Model viewer button on the main menu, under the Benchmark button. Browse every character (human with any weapon and power, zombie, crouch, robot and knight bosses, grenade), every weapon model, the shield dispenser and medkit, plus all enemy, vehicle and effect sprites. Drag to rotate, scroll or +/- to zoom, double-click to reset; Esc goes back.

2.27.1
- Floors 5 and 10 (and any other boss arena): the regular enemies no longer appear until the opening boss cutscene is over.
- Single player: enemies, bosses and enemy turrets can't attack for the first second of a round (and for the first second after a boss cutscene), so you can't die the instant a floor starts.

2.28.0
- Discord Rich Presence: while the Discord desktop app is running, your profile shows "Playing Arberia Deathmatch" with the game icon and what you are doing: In the menus, Singleplayer (Floor N), or Multiplayer (In the lobby, or the mode you are playing, e.g. Infection). The timer restarts when you switch between menus, singleplayer and multiplayer.
- Turn it off in Settings > Online > Discord, or put "discord": false in settings.json.
- ONE-TIME SETUP for whoever builds the game (Discord needs its own Application ID, which only you can create):
    1. Go to https://discord.com/developers/applications, press New Application, name it  Arberia Deathmatch  (that name is the "Playing ..." text).
    2. Copy the Application ID from General Information. Put it between the quotes in  const APP_ID = '';  at the top of discord.js
       (or in settings.json as  "discordAppId": "123...",  or set the ARBERIA_DISCORD_APP_ID environment variable).
    3. In the same app, open Rich Presence > Art Assets and upload build/icon.png with the key  icon .  (Assets can take a few minutes to show up.)
    4. Rebuild. Without an Application ID the feature stays silently off.

2.28.1
- Discord Rich Presence now ships with the Arberia Deathmatch Application ID built in, so it works out of the box (the app's name and the art asset keyed  icon  still come from the Discord Developer Portal).

2.29.0
- Discord invites: while you are in a multiplayer game, your Discord status now has a party (players / 16) and a join button. Friends can press Join on your profile, or you can use "+" > Invite to play in a Discord chat. Clicking Join in Discord connects them straight to your game. Friends who press "Ask to join" are invited automatically while you are in a game.
- It uses the same address friends would type in manually, so the usual rules apply: the host's port 7777 must be reachable (port forwarded, or same network). Players who joined through Steam don't offer the button.
- Discord only passes the join to a game that is already running, so your friend needs to have the game open first.
- Turn it all off in Settings > Online > Discord.

2.29.1
- Floors 5 and 10 opening cutscene: the coliseum gate now rises much higher (right up under the roof) so the knight walks out without clipping through it, and it stays raised for the fight.
- The raised gate now hangs between two thin stone pillars so it no longer looks like it is floating.

2.29.2
- Coliseum (floors 5 and 10): the arena walls and roof are taller (1.9 to 2.8), so the raised gate now sits above the knight's head and stays visible instead of disappearing into the roof. The gate pillars were made taller to match.

2.29.3
- Coliseum gate: the arena roof is higher still (3.3), so when the gate rises it hangs as a big, clearly visible portcullis above the knight's head between its pillars, instead of a thin strip.

2.29.4
- Coliseum: the arena walls are back to their original height. Only the gateway is taller: the gate and its pillars rise above the wall line, so the raised gate hangs there as a big, clearly visible portcullis above the knight's head instead of vanishing.

2.29.5
- Coliseum: arena walls are back to the 2.29.2 height (2.8). The gate and pillars still rise a little above the wall line so the raised gate stays visible.

2.29.6
- Coliseum (floors 5 and 10): no cover or obstacles are placed in a lane up the middle between the player's start and the gate, so nothing can block the view of the gate and the knight during the opening cutscene.

2.30.0
- In-game file browser (map and skin picker): new sort dropdown next to Go. Choose "Sort: Recently modified" to see the newest files and folders first, each with its date. Your choice is remembered.
- Needs the desktop app update (main.js) as well as the game files.

2.30.1
- Fixed the file browser showing 1969/1970 dates when sorting by recently modified (the date was being stored in too small a number).

2.30.2
- The main menu now says "Pre-Alpha" right after the version number.

2.31.0 / 2.31.1
- Pits are more forgiving: the edge of a pit is now solid. Walking into a pit stops you at the edge, and only if you keep pushing into it for half a second without letting go do you step in and fall. Letting go resets the half second. Dashing across a pit works as before.

2.31.2
- Single player and co-op: enemies no longer spawn in the same room as the player. They never appear in or next to the start room, never within 7 tiles, and (where the floor has space) never anywhere the start can be seen from. Custom maps avoid spots in line of sight too.
- Co-op: players now spawn in the start room, which never has enemies in it at the start of a floor.

2.32.0
- Melee hits on you now have clear feedback: a heavy thud, a red flash, and a red arc on screen pointing at whoever hit you (monsters, the knight and other players' melee weapons).
- Weapon names are now honest. The word in front of the weapon comes from what it really has: its perk (Blazing, Frostbitten, Explosive, Vampiric) or its most extreme rolled stat (Heavy/Feeble, Rapid/Swift/Sluggish, Extended/Stubby, Quick/Clunky, Wild/Steady, Long/Short), or Standard if nothing stands out.
- Hits stagger enemies: a short slowdown and a small shove (bosses and turrets are unaffected, and it cannot be chained).
- After the power/upgrade menu opens, you can't pick for half a second (the cards are dimmed until then).
- Blink Step now goes the way you are moving (W/A/S/D or a diagonal), or straight ahead when standing still.
- Hearts dropped by enemies now show on the minimap.
- Quake hammer: the head is turned so its striking faces lead the swing instead of the flat side.
- Rattler: the drum spins while you fire.
- Leech now works on every hit: tiny hits (for example from fast low-damage guns) no longer heal nothing,.
- Enemies must have a clear line of sight to you for 0.3 seconds before they start shooting (no more being shot the instant you round a corner).
- Weapon damage falloff is a little gentler.
- Shooting an enemy now wakes it up and makes it come for you, even from beyond the weapon's damage range.
- Single player: base movement speed is 10% faster.
- Melee builds are no longer offered powers that only affect guns (Needle tips, Speed loader, Quick hands, Extended mags).
- Cold snap now says exactly how much it slows: 50%.

2.32.1
- Leech no longer heals from damage that a shield absorbs (only damage that hits health leeches).
- Confirmed: the gentler weapon damage falloff applies to the player's weapons in every mode (single player, co-op and multiplayer).

2.33.0
- Enemies cannot have powers on floors 1-2; on floor 3 only a very small chance. (Trait modifiers like Swift/Armored are unchanged.)
- Knockback now slides you quickly over a moment instead of teleporting.
- New power "Second opinion": +1 option when choosing powers.
- Fixed the big framerate drop when green acid is on screen.
- Acid now deals 5 (+ a little per floor) per tick and slows you 15% while you stand in it.
- Fan Gun range +25%. Barbed Wire damage is now 50.
- Single player: grenades deal +50% damage and the Grenade power stacks (damage doubles per stack, max 3x total).
- Map props are now real 3D objects that block bullets and projectiles; turrets are 3D too.
- Single player reward screens offer at most two activated powers.
- Mineshaft has a little cover now.
- New powers: Panic sprint (move faster after a melee hit) and Pain fuel (attack faster after a melee hit).
- Enemies have a thin red outline, allies a thin blue one. Projectiles are drawn at 80% opacity.
- 0.2 seconds of invulnerability after you are hit (single player and co-op).
- Splash Rounds also splash when hitting walls and floors, at 25% strength.
- New power "Overheal": hits while at full health grant Overhealth (up to 20).
- Shove is now only used by a new enemy type, the Shover.
- Single player enemy movement speed is capped at 3.0.
- Close Game button on the main menu.

2.33.1
- Enemies no longer get any modifiers (Swift, Armored, Shooter, etc.) on floors 1 and 2.

2.33.2
- Enemy modifiers are half as common on floors 3 and 4, and 75% as common on floor 6 (still none on floors 1-2).

2.33.3
- City cars are now real 3D models that block bullets and movement, instead of flat sprites.

2.34.0
- New Gamma slider in the video settings (Display section): brightens or darkens the whole picture. Saved between sessions; Reset button returns to 1.00.

2.34.1
- New Mouse sensitivity slider in Settings > Controls (0.10 to 4.00, saved, Reset button).
- New skin template: a clean grey figure with labelled head, body and arms, legs and gun zones and a grid, easier to paint over.
- Boss intro (floors 5 and 10): the "SPACE: skip" hint was cut off at the bottom of the screen; it now sits fully inside.

2.35.0
- Non-humanoid enemies (blobs, Shovers, Acid Bots, the summoner boss) now have a glowing green rune weak spot. Hitting it does headshot damage (x2.5).
- Props can no longer seal off the exit or an enemy: if a floor would be blocked, the offending props are removed when the floor loads.

2.35.1
- The green weak-spot rune is about a third smaller, and on blob enemies it is placed clear of the eyes, mouth and armor band (the hit area moves with it).

2.36.0
- Cursed chests (single player, floor 6 and deeper, about one floor in four): a purple chest with a glowing skull. Opening it offers three (more with Second opinion) cursed powers: three copies of a normal power at once, each with a curse. You can also walk away. Cursed: Barbed hide, Leech rounds, Splash rounds, Lucky eye, Second wind, Needle tips, Bounty hunter, Berserker, Chain lightning, Executioner, Corpse bomb, Momentum, Speed loader. Curses: +25% damage taken, -25% max HP, -20% damage, -20% fire rate, -15% move speed, or 30% slower reloads.

2.36.1
- Cursed chest curses are a bit milder: +20% damage taken, -20% max HP, -15% damage, -15% fire rate, -10% move speed, 25% slower reloads.

2.37.0
- Rare powers: after every boss win, the four reward options are now RARE powers (gold border). They never appear anywhere else.
  Lifeline (regenerate 3 HP/s always), Super turret (ability: twice the fire rate, health and damage, 12s, 20s cooldown), Super shield (50 shield, regenerates 5/s), Aimbot (every hit on a humanoid is a headshot; melee: +50% damage vs humanoids), Rangifier (+50% range on any weapon), Za Warudo (ability: stop time for 5s, 30s cooldown), Messiah (ability: walk over the void for 5s, 15s cooldown), Snooze bullets (hit enemies move 50% slower and attack 30% slower for 3s), Nano boost (ability: 200% damage for 10s, 30s cooldown), InstaLoad (every third reload is instant; melee +30% swing speed).

2.37.1
- Player turrets can now be destroyed: the Sentry turret has 40 HP and the Super turret 80. Enemy bullets damage them, and enemies standing next to one hurt it.
- Rare power cards on the reward screens glow gold (pulsing), and rare abilities get a glowing gold outline on the ability bar.
- Normal chests and floor rewards have a 1% chance of containing one rare power.

2.37.2
- Multiplayer: sentry turrets can now be shot down by other players (bullets and melee). 40 HP, or 80 for the Super turret; the turret is destroyed on everyone's screen. Super turrets are now also visible to other players in multiplayer.

2.38.0
- Props now face into the room: bookshelves, cabinets and tables no longer show their backs.
- Fixed the floating bar under the table (it is now two rails joining the legs).
- Chests (normal and cursed) and the exit portal are now real 3D objects with the same look as before.
- The patcher can now bridge up to 30 previous versions (was 20). Versions older than what tools/history holds from before this release cannot be included.

2.38.1
- Fixed the Super shield: it now starts full (50), shows the SHIELD counter above your health, and the counter shows in single player too.

2.39.0
- New floor 15 boss: VHALORU, THE UNBLINKING, a towering hive-alien fought in the coliseum (single player).
  Gimmick - the eye: its shell soaks half your damage (x0.5) while the eye is shut. The eye opens to charge a GAZE: it takes x1.6 damage while open, but when the gaze fires it hits you hard if you are LOOKING at it.
  Look away (or break line of sight) before it fires, or deal about 6% of its health during the charge to stagger it - the eye stays open and exposed for 3.4 seconds.
  Other attacks: a fan of plasma bolts, a tentacle slam with a shockwave when you get close.
  Phase 2 (below 50%): it roars, turns red, fires double volleys, charges its gaze faster, and adds a GRAVITY PULL that drags you in before a shockwave - run away from it.
  On-screen hints show whether the eye is open and warn you when to look away.

2.40.0
- New space boss stage for floor 15 (single player): ORBIT, a ring of floating platforms high above a planet, with Vhaloru waiting on a platform at the summit.
  The floor opens with a cutscene: you ride a space elevator up its tether from the surface to the summit (press Space or Enter to skip).
  Low gravity (half): jumps are floaty and long. Climb the spiral of platforms around the arena, with some launch pads and a few checkpoints along the way.
  Falling into the void costs 10% health and puts you back at your last checkpoint.
  Vhaloru wakes as soon as you step onto its arena. Beat it to open the exit portal.
- Multiplayer/co-op still treats floor 15 as a normal floor.
- Fixed a possible missing-reset on the fall check in span-world maps.

2.40.1
- New boss music for Vhaloru on the Orbit stage: "Beyond the Veil", an epic cinematic orchestral piece in E minor. Strings, brass and horns, harp, celesta, taiko and choir, all synthesised in-game with reverb (no chiptune sounds).
  It builds from a quiet solo horn and choir, through a driving cello ostinato, to the full brass theme, then speeds up and thickens when Vhaloru enters phase 2. A triumphant major chord plays when it falls.

2.41.0
- Debug mode: new Sound tester button on the title screen, below Model viewer. Click any of about 80 sound effects (weapons, player, abilities, world, bosses, interface) to hear it, play either boss theme (plus Phase 2 and the victory stinger), or build a sound with pitch, slide, length, volume and wave sliders and copy its snd(...) call.

2.42.0
- Shops (single player). Every city floor now has one SHOP with a green OPEN sign on its door and a green-striped awning; any other SHOP buildings show a red CLOSED sign.
  Once every enemy on the floor is dead, walk into the OPEN shop's door to be taken to the shop floor. Walk back out through the shop's door to return to the city.
- The shop floor is a 3D room with shelves of powers, a rug, a counter and a cashier. You carry a shopping basket instead of a weapon there.
  Aim at an item to see what it is and its price (regular powers $20-$40, rare powers $100, and a rare one only turns up sometimes). Press the use key (F by default) to put it in your basket, or press it again on the same item to put it back.
  Walk to the register and press the use key to pay. You can't leave with unpaid items in your basket.
- Money: $1 for a regular enemy, $5 for a boss. It shows in the Tab menu (and at the top of the shop screen).
- New power: Pocket change. You earn $1 more for every enemy you kill.
- Cute shopping music plays while you are in the shop.
- Debug Sound tester: added the shop theme.

2.42.1
- The shop is now a small, realistic corner shop (9 x 7) instead of a big hall: shelves along the walls, a counter with the cashier in the corner, and the door in the middle of the front wall.
- The shopping basket you carry is now a 3D model with a handle, and the items you pick up show inside it.

2.42.2
- Your eye height is now higher in every mode: you look at enemies' heads instead of their necks (classic floors and the multiplayer maps, plus the imported 3D maps, which got a smaller bump because their player hull is fixed).

2.42.3
- The regular table prop is now a third smaller (model and collision size).

2.43.0
- Vhaloru's boss theme "Beyond the Veil" now uses real recorded orchestral instruments instead of synthesized ones: string section, solo and section French horns, trumpets, trombones, cellos, double basses, violins, harp, tubular bells, choir and timpani, played through a concert-hall reverb. The recordings (about 3.7 MB, in game/orch) load the first time the theme is needed; if they cannot load, the old synthesized version plays instead. The win fanfare and the phase 2 hit use the real instruments too.
- Instrument samples: Musyng Kite soundfont via the midi-js-soundfonts project (https://github.com/gleitz/midi-js-soundfonts), licensed Creative Commons Attribution-ShareAlike 3.0 (https://creativecommons.org/licenses/by-sa/3.0/). Notes were resampled and trimmed for size. The samples are covered by that license.
- The page security policy now also allows scripts from the game folder itself (to load the sample files).

2.44.0
- The floor 10 boss (knight) phase 2 music is now a full orchestral battle theme using the real recorded instruments: a massed choir singing sustained chords, rhythmic choir and brass stabs, driving cellos and violins, timpani, horns, trumpets and trombones carrying the theme, and tubular bells. The phase 2 transition hit and the win fanfare use the real instruments too. Phase 1 stays as it was. The recordings start loading when the fight begins; if they cannot load, the old sound plays.

2.44.2
- Fixed: music no longer stops for good after pausing. Shop music (and boss music) now goes quiet while the game is paused and picks up again when you unpause.
- Fixed: the shop stock no longer re-randomizes when you leave and come back. Each floor's shop keeps the same items, prices and shelf positions for the whole run, and items you bought stay gone.

2.45.0
- Shop: a scratch-off ticket stand next to the counter. Look at it and press the use key to buy a "Lucky Stars" ticket for $10. The ticket opens on your screen with 6 silver boxes: scratch them off with the mouse (hold the button and drag). Match 3 symbols to win: 3 of the same suit/note wins a random power (19.5% chance), 3 stars wins a rare power (0.5% chance), otherwise nothing (80%). Prizes are decided when you buy; Reveal all / Done will uncover everything and still hand over a win. The shop music keeps playing while you scratch.

2.46.0
- New cosmetic type from Loot Boxes: titles. There are 15, from Noob to GOAT: Noob, Gamer, Monkey, 67, Goblin, Menace, Sweaty, Cracked, Sigma, Ghost, Reaper, Warlord, King, Immortal and GOAT, each with its own colour and rarity. Wear one from the Loot Boxes screen (new Titles section). It shows in front of your name in [brackets] in your profile preview, and other players see it on your name tag and on the scoreboard in multiplayer. Titles are saved in profile.txt like hats and capes.
- Multiplayer: the server relays the title (server.js changed, so a host needs this version to show titles to others).

2.47.0
- 5 new hats from Loot Boxes: Cool Shades (black lenses and frames), Soda Hat (red cap with a blue and a red soda can and two straws), Dunce Cap (white cone with a red band and a D), Cube Head (your head becomes a blocky cube with a pixel face) and Gas Mask (round lenses, strap and a filter canister). They are added after the titles, so existing loot box saves keep working.

2.48.0
- Two secret cosmetics. They show as "?" on the Loot Boxes screen with no hint, are not in loot boxes, and are unlocked by playing: a secret title (Gambling Addict) and a secret legendary cape (Alien Cape) with a bat-wing shape, glowing bones and an eye on the back. The cape needs a server.js change so other players can see it in multiplayer.

2.48.1
- Loot Boxes: beating floor 5 (reaching floor 6) only gives a Loot Box the first time ever. Beating floors 10, 15, 20 and so on still gives one every run. Players who have already reached floor 6 before count as having claimed the first one. The claim is saved in your profile.

2.49.0
- New multiplayer mode: One in the Chamber. Everyone has a Hand cannon with a single bullet and 3 lives, and there are no powers. Any hit, anywhere on the body, kills in one shot. Killing a player (with a shot or a punch) gives you one more bullet, and that is the only way to get more; you can't reload. You respawn with one bullet. Press V for a quick punch that kills in one hit but only reaches a short distance and has a 2 second cooldown (the server enforces both). Run out of lives and you are out and spectate the rest; the last player alive wins. The scoreboard shows lives and is sorted by lives, then kills. Bots play it too.
- Everyone, including the server, needs this version to play One in the Chamber. Set it in the lobby mode list or with "mode oitc" in the host console.

2.49.1
- One in the Chamber: the V melee is now a pistol-whip with the Hand cannon (the gun swings across and down) instead of a fist.

2.49.2
- Loot Boxes page: each category (hats, capes, titles) is now sorted by rarity, Common first and Legendary last, with the secret cosmetics at the very end.

2.50.0
- New regular power: Climbing Hooks. You can never fall into a pit: pit edges stay solid however long you push, and if an enemy knocks you or you dash into one you are put back on the last safe spot. You can only hold one.
- Jumping in single player: press Space to jump (the key is still rebindable under "Jump"). A jump lasts about 0.7 seconds and clears a pit up to 2 tiles wide when you launch from the edge; landing in a pit still drops you. In multiplayer on normal maps Space is still the alt fire key; imported maps already had jumping.

2.50.1
- Climbing Hooks fixed to work as intended: pits become solid walls for you (nothing happens when you walk at them) instead of letting you walk across.

2.50.2
- Fast guns (Rattler, Twin fang, and other guns without heavy recoil such as the Pistol, Fan gun and Needler) now kick the gun view model UP when firing instead of down.
- Rattler and Twin fang now have a small amount of view recoil.

2.50.3
- Rattler and Twin fang view recoil halved.

2.50.4
- Rattler and Twin fang recoil reworked into a real aim climb: each shot raises your view a little and it recovers slowly (about a second after you stop), so holding the trigger makes your aim drift up unless you pull down with the mouse. It is gentler than the Sniper or Hand cannon per shot.

2.50.5
- Needler now has the same aim climb as the Rattler and Twin fang (a smaller amount per shot, since it fires much faster).

2.50.6
- Bullet holes on walls now follow where you aim vertically (they were always at a random mid-wall height). Aim up and the marks land higher on the wall; aim down and they land lower, clamped to the wall surface.

2.50.7
- Fixed jumping in single player (Space did nothing in a normal run). The jump now has the same height and air time as on imported maps, and you can hold Space to keep jumping.

2.51.0
- Jumping now also works in multiplayer on the normal (non-imported) maps. Space is jump everywhere, so it is no longer an alt fire key. Other players see you in the air. The jump is cosmetic and for crossing pits: shots still hit the same whether you are in the air or not. Players on older versions will not see your jumps, so everyone should update.

2.52.0
- The Marksman now has iron sights: hold the right mouse button to aim down them. The rifle moves to the centre of the screen so you look along its rear and front sight, the view zooms in a little (less than the Sniper scope), mouse sensitivity drops while aiming, and your shots spread less. Reloading cancels it. The Sniper keeps its scope.

2.52.1
- Marksman iron sights: the rifle stock is drawn again while aiming (it looked better than hiding it).

2.53.0
- Hardware 3D rendering. The normal levels (singleplayer floors, shops, the colosseum, city, CTF and the other built-in multiplayer maps) are now drawn by your graphics card (WebGL 2) instead of the processor, so they run much faster, especially at high resolutions. Imported 3D maps (including Orbit) still use the Software renderer for now.
- Settings > Rendering is now the single place for this: choose Hardware (GPU) or Software, and under Hardware pick which graphics card and (on Windows) which graphics API. Hardware is the default; a computer with no dedicated graphics card starts in Software. If the graphics card cannot be used the game falls back to Software on its own.

2.54.0
- Shop overhaul. With Enhanced textures on, the shop's walls (damask wallpaper, panelled wood wainscot, chair rail), floor tiles (bevels, grout, shine, scuffs), rug (woven diamond pattern, fringe), neon SHOP sign and EXIT sign are redrawn with much more detail, and the shelves (posts, header board, pegboard, price tags), counter (scratch-off rack, tip jar, candy bowl, receipts, sanitiser) and prize cabinet (handles) get extra models.
- Every power on the shelves now has its own little model that looks like what it is: Light boots are a boot, Plated vest is a vest, Lucky eye is an eye, Sentry turret is a turret, Frag grenade a grenade, Field medic a first-aid kit, Climbing Hooks a grappling hook and so on. Rare powers sit on a purple and gold stand.
- New silly "SCRATCH-OFFS!" poster on the shop's right wall, styled like a convenience store lottery poster, with a ticket, a $10 badge and fine print.

2.54.1
- The scratch-off ticket machine now stands against the wall next to the poster (in the shop's south-east corner), and its sign reads SCRATCH-OFFS.

2.54.2
- Enhanced textures: the shop counter and scratch-off machine are much more detailed. The counter has raised red panels with bevels, a steel trim and kick plate, wooden end caps and a speckled laminate top with veining. The machine has real wood plank grain on its front, sides and top, framed ticket slots with price tags and labels, a coin slot, a ticket tray, a plinth and a marquee ringed with glowing bulbs.

2.55.0
- The shop has a hot dog stand in its south-west corner: a table with a hot dog roller grill whose rollers and hot dogs really turn, a "HOT DOGS $5" sign, ketchup, mustard, buns and napkins. Look at it and press the use key to buy a hot dog for $5 that heals 20 HP (it will not sell you one at full health).

2.55.1
- The shopping basket you hold is now a real basket: hollow, with a visible inside and floor, a rim, and a twisted wicker handle. With Enhanced textures it is woven from many more panels with slat lines, and the items you pick up now sit inside it.

2.56.0
- New singleplayer frame rate limit in Settings > Display: 60, 90, 120, 144 or Custom (any value from 1 to 999). Multiplayer always stays at 60. Rates above your monitor's refresh rate need a game restart (a "Restart to apply" button appears) because Chromium's built-in limiter has to be switched off at start-up.


2.57.0
- The debug command Y, O, 2 (needs debug mode on) now opens a Debug menu instead of skipping a floor. It can go to any floor or advance one, force the floor type (dungeon, cavern, lab, crypt, manor, foundry, city, mineshaft, coliseum, station; applies when a floor loads, Auto restores normal), give any weapon with a chosen perk, give any power, set money to any value, toggle invulnerability, fully heal, clear enemies, and spawn normal enemies, humans, bots, shovers, knights, bosses or aliens. Singleplayer only. Esc or Close returns to the game.


2.57.1
- Fixed items poking out through the sides of the shopping basket: each item you pick up is now shrunk to fit and sits inside the basket.


2.57.2
- Fixed shop furniture (like the counter) vanishing when you stood next to or alongside it: the shop no longer culls objects by their centre point or hides back-facing surfaces, so everything stays drawn from every position.


2.58.0
- The smoke bomb is now a natural billowing cloud instead of a flat circle. With Hardware rendering it is a real 3D volume: a lumpy, drifting cloud with soft wispy edges, darker folds inside and lighter tops, that rises to fill the room and hides enemies behind it. Software rendering gets a simpler version with a rounded, uneven silhouette. Smoke still blocks line of sight in the same area as before.


2.59.0
- New weapon: the Flamethrower (single player and multiplayer, also in Gun Game / Arms Race). It sprays a short-range jet of fire (about 7 tiles, 70 rounds per tank) that passes through the first two targets. Every hit sets the target alight, and unlike the Ember rounds power the burn STACKS with this weapon: each four hits add a stack (up to 10) and every stack makes the burn hurt more. The model is a detailed 3D flame projector of about 820 polygons: olive-drab fuel tank, vented heat shield, ribbed hose, brass pilot light and pressure gauge.
- Burning enemies (from the Flamethrower, Ember rounds, Blazing weapons or the Gravity well) now visibly burn: tongues of flame lick up the body, embers fly off, dark smoke rises and the sprite flickers. More stacks mean a bigger blaze.


2.60.0
- The Flamethrower is now held further to the right on screen.
- Rebuilt the five weapon models that were under 100 polygons in the same detailed, realistic style as the Flamethrower: Pistol (a 1911-style service pistol with serrated slide, sights, hammer, safeties and checkered grips, about 690 polygons), Scattergun (a coach gun with banded twin barrels, bead sight, engraved action, hammers and walnut furniture, about 900), Twin fang (two compact fang-compensated machine pistols with finned barrel shrouds, curved fang magazines and red-dot sights, about 910), Needler (a crystal flechette carbine with a glass magazine of glowing needles, four-barrel cluster and heat fins, about 750) and the Reaper axe (a scythe with an S-curved snath, leather wraps, iron collar, crescent blade with glowing runes, skull pommel and chain, about 630). They keep the same hand positions, recoil and swing animations.

2.61.0
- New: emotes. Hold B to open the emote wheel, move the mouse (or press 1-5) to pick, and release B to play it: Thumbs up, Thumbs down, Peace, Come here (beckon) and Wave. Your left hand comes out into view, and in multiplayer other players see the same gesture on your character. Emotes last a couple of seconds and stop if you shoot or reload. In Defuse and Cash modes a quick tap of B still opens the buy menu.

2.61.1
- Fixed the version number on the title screen, which had stopped updating (it showed 2.48.1). It now always matches the installed version.

2.62.0
- Super turret replaces the Sentry turret when you get it, and the Sentry turret is no longer offered while you own the Super turret.
- Removed the + sign that floated above chests.
- Powers with a limit now say so: hovering one in the shop that you can't take any more of shows "Max reached". Lucky eye and Executioner now max out at 5 copies, Pocket change at 2 (Second opinion stays at 3, Frag grenade at its current limit).
- Cursed "Reloads take 25% longer" is now "swings 25% slower" for melee weapons.
- Shop prices: regular powers $30-$50, rare powers $150. Scratch-offs are limited to 10 per shop and their odds are no longer shown.
- You can hold at most $200.
- Fixed the SHIELD text in the shop jumping around when hovering over items.
- The same power can never be activated again within 1 second, no matter how much Overclock you have.
- Splash rounds now do 25% damage per copy everywhere (enemies and walls), not 50%.
- Ashen Knight: 25% more health. In phase 2 it attacks twice as often and its shots are twice as fast.
- Floor 15 boss (Vhaloru): 25% more health, attacks twice as often, the gaze now does 150 damage, and every few seconds it sends out a fire pulse along the ground that sets you on fire (x5) unless you jump over it.
- Enemies that fall off the map now always die, ordinary enemies no longer walk off ledges on floor 15, and bosses can't be knocked off the map.
- Floor 15 runs faster at high resolutions (the 3D world drawing is about 40% quicker).

2.62.1
- Overclock (ability cooldown recharge) now caps at 3x.

2.62.2
- Regular power prices in shops are now $40-$60.
- Overclock is now treated like Lucky eye once you reach the 3x cap: it is no longer offered, and the shop says you cannot get more.

2.63.0
- Floor 15 (the space station) and other 3D-world levels now use the hardware (GPU) renderer when Hardware rendering is on, instead of always falling back to the software renderer. The level is uploaded to the graphics card once, including moving parts and water, and enemies, effects and smoke are drawn on top as on every other floor. This removes the high-resolution lag on floor 15. Software rendering is still used if you choose it or no graphics card is available.

2.63.1
- Rangifier is now +30% range (was 50%).
- Scratch-off odds are now 14.5% to win a power and 0.5% to win a rare power.
- Pocket change can only be taken once.

2.64.0
- Floor 14 no longer ends with a portal: you have to walk into the space elevator (a lift cabin with doors that glow open once the floor is clear).
- The Floor 15 boss's fire pulse now sets you on fire for 8x (was 5x) if it hits you; jumping over it still avoids it.

2.64.1
- The floor 14 space elevator no longer turns to face you diagonally. It stays square to the grid, so on a bridge it lines up with the bridge, and its door always opens onto a neighbouring tile you can stand on (the side nearest where you started).

2.64.2
- Enhanced graphics: the floor 14 space elevator is now much more detailed - riveted wall panels, corner posts, ribbed sliding doors with windows, handles and a lock light, a hazard-striped sill, a floor display above the door, a grated floor, light strips and handrails inside once open, and a cable rail running up out of sight. Classic graphics keep the simple cabin.

2.65.0
- Beating the Floor 15 boss no longer opens an exit portal. Vhaloru's station loses orbit and a cutscene plays: it falls on the Earth, burns up on re-entry, crashes into a city in a huge explosion, and "THE APOCALYPSE HAS COME" appears. (Space/Enter skips.) Then you go on to floor 16.
- Every floor after 15 is now a ruined, post-apocalyptic version of itself: wall, floor and ceiling surfaces are darkened, sooted, stained and cracked; breaches are blown through walls and filled with rubble; rubble heaps, toppled columns and a few fires are scattered about (never blocking the way to the exit); the sky is a gloomy ash-red; fog is thicker; ash and embers drift through the air; and there is the occasional distant rumble. The floor name shows as "Ruined City", "Ruined Lab", etc.

2.66.0
- With hardware rendering on, the apocalypse cutscene is now a full 3D scene: a lit planet with atmosphere, the alien station as a spiked 3D model glowing and breaking apart on re-entry, a city of towers seen from street level, the station crashing down, a fireball with a shockwave that topples the buildings, flying debris, a mushroom cloud and drifting ash, then the title. Software rendering keeps the 2D version.
- Ruined city floors: no window has a light in it any more.
- Ruined coliseum floors: the stands are empty (no spectators), and the distant skyline is charred with no lit windows.

2.67.0
- Shop is now a bit apocalyptic on floors after 15 (dim, dirty, broken shelves, debris) and the shopkeeper wears a post-apocalyptic outfit.
- Quiet, eerie ambient music during the apocalypse cutscene.
- After the floor 15 boss: a uniquely designed escape pod appears on the boss platform. You have 20 seconds to get in before the cutscene; miss it and you die as the station falls.

2.67.1
- Debug only: new power "Free flight (debug)". It is hidden from every reward, shop, chest and loot pool and can only be given from the debug menu (Power dropdown). Space rises, Ctrl descends, no gravity (works in 3D levels and regular floors).

2.67.2
- Fixed boss music stopping for good after opening the Tab menu. It now mutes while the menu is open and resumes when you close it.

2.67.3
- The apocalypse cutscene music now uses the real recorded orchestra: bowed bass drone, clashing strings and choir swells, lone high violin, distant tolling bells, soft timpani heartbeat, low horn and sparse harp. Eerie and quiet.
- Fixed the floor 15 "LOW GRAVITY" text being cut off at the bottom of the screen.

2.68.0
- Floor 15 boss (Vhaloru): every attack now has its own distinct sound. Gaze beam (rising whine, then a laser crack), bolt volley (chirp, then a burst of zaps), slam (groan, then thud and crunch), vortex (swirling hum, then an outward blast), fire ring (crackling build-up, then a rolling whoosh) and the phase change (a tearing scream).
- New enemy: the Mutated Fox. Only appears on floors 16 to 24, 1 or 2 per floor. A 3D model with extra glowing eyes, spine spikes and growths. Very fast, but low health and damage. It circles you, then opens its jaws and lunges.

2.69.0
- Regular fox: on floors 1 to 14 there is a 5% chance a fox is on the floor. It is passive, never attacks, does not count as an enemy and does not need to be killed. It just wanders around. Get close and look at it, then press P to reach out and pet its head.
- Human enemies on floors 17 and up now wear dirty post-apocalyptic outfits (faded, patched clothes, dust mask, goggles, headband, bandolier, shoulder rag). Not on floor 16.
- New Sound section in Settings (Audio tab): Master volume, Sound effects volume and Music volume sliders, saved between sessions. Master also scales the YouTube music.

2.69.1
- The Esc pause menu now has a Settings button, so you can change settings (graphics, sound, controls and so on) during a run. Back returns to the pause menu.

2.69.2
- Bosses can no longer randomly appear on floors 1 to 4. The first boss is now always floor 5. After that the random 15% chance is back, plus the guaranteed boss every 5th floor.

2.69.3
- Hitting a weak spot or head now says CRITICAL HIT instead of HEADSHOT (the Aimbot power text follows).
- The exit portal no longer takes you to the next floor if it opens while you are standing on it. You have to step away from it first, then walk back in.

2.69.4
- Correction: CRITICAL HIT is shown only when you hit a monster's weak spot. Hitting a humanoid's head says HEADSHOT again (and the Aimbot text is back to headshot).

2.69.5
- Singleplayer: Sniper fire rate +25% and magazine size is now 3. Multiplayer is unchanged.
- Fixed a monster being able to appear on top of you when the boss fight starts after the coliseum intro cutscene (floor 5 and the other coliseum bosses). Any monster within 8 units of you is moved away.

2.70.0
- City buildings labelled BOOKS can now be entered (once the floor is cleared, like the shop): walk through the door. Inside is a small bookstore with two red bookshelves on the west wall and two blue ones on the east wall.
- Look at a shelf and press the use key to take a book down. Blue shelves open a page from the middle of a book about how the aliens arrived, offered gifts and demanded obedience, and how so many people willingly submitted (with hints about Vhaloru). Red shelves open a page about the huge bounty on you (using your player name) that Vhaloru put out because he deemed you a threat to the peace. Each colour has two different pages. Esc or the use key closes the book.
- Bookstores look ruined on the floors after 15, like the shop.

2.70.1
- The bookstore greeting now says "Welcome to the library!".
- Fixed Crimson Knights and Ashen Knights hitting you through walls. Their ground slam, sword swing, charge and phase-change shockwave now only hurt you when nothing solid is between you and the hit.

2.70.2
- The library room is smaller: 7 x 5 (was 9 x 7). The four bookshelves moved in with the walls.

2.70.3
- The library room is smaller again: 5 x 3. Two red shelves on the west wall, two blue on the east wall.

2.70.4
- Mineshaft levels now have some real walls: about one in five of the old wall blocks (in 2x2 chunks) stays standing, rising out of the pit. Paths to the exit are never blocked.
- Model viewer (debug): added the apocalyptic human, Vhaloru (both stages), the escape pod, the space elevator (classic and enhanced, open and closed), the library shelves (red and blue) and the shopkeeper (normal and apocalyptic).

2.70.5
- Model viewer (debug): added all the props (crate, barrel, pillar, table, bookshelf, brazier, urn, cabinet and the rest), both turrets, both chests, the exit portal, the gate, the scratch-off machine, the shop dog, the shopping basket and a 3D icon for every power.

2.70.6
- Floor 15: Vhaloru no longer waits on the platform. He teleports in (sparks gathering, a flash and a shockwave) only once you step onto it.
- The moment you step onto the platform it seals: glowing light-barrier walls rise on all four edges and you can't leave until the fight and the escape are over.
- Fixed the "left behind" cutscene playing twice when you miss the escape pod.

2.70.7
- Floor 15: the platform parkour has 25% fewer platforms (39 down to 29) and the route curves in toward the arena sooner, so it takes about a quarter less time to get through. Platform sizes, gaps, jump difficulty, the arena and everything else are unchanged; checkpoints and enemies on the route were rescaled to fit.

2.70.8
- Floor 15: the platform parkour now has 20 platforms (was 39). The route curves in toward the arena sooner and the platforms are about 30% bigger so the jumps stay fair; no gap is wider than before. Checkpoints and enemies on the route were rescaled to fit.

2.70.9
- Enemies can now spawn 1 tile closer to the player in singleplayer: the minimum spawn distance is 6 tiles (was 7), 9 on cramped floors (was 10), 6 on the coliseum floors (was 7), 13 on custom maps (was 14), and 7 for monsters placed at the start of a boss fight (was 8).

2.71.0
- Melee weapons can now block: hold right click and you raise the weapon across your body. While blocking you take 33% less damage but move at half speed, and you can't swing until you lower it.

2.71.1
- The library has a small table against the back wall with a collection box on it, labeled "Tribute for the Unblinking". It holds $5 which you can take (once per library).

2.72.0
- Libraries you can enter now have a glowing OPEN sign on the door.
- The Tribute for the Unblinking box now opens a small menu: take the $5, donate $200 (only if you have $200), or walk away.
- If you donated, Vhaloru on floor 15 does not fight you. After he teleports in he welcomes you as a loyal supporter, and a futuristic table rises from the floor with a button: DESTROY ALL DISSIDENTS. Press it and a 3D cutscene shows a beam fired from the station onto a village, then the game ends with "You have accepted the alien rule of earth".
- If you attack Vhaloru before pressing the button, the table sinks away and the normal boss fight starts.

2.72.1
- Executioner is capped at 4 stacks.
- Rattler damage +10%, Scattergun damage +10%.
- Shots (yours, enemies' and bullets) no longer pass through a crusher while it is down.
- New secret cosmetic: the Alien Mask, a grey-green alien face mask. It shows as ? in the Loot Boxes menu (description: "Get the secret ending.") until you press the button in the alien loyalty ending.

2.72.2
- You can no longer donate $200 to the Tribute box after floor 15.
- Fixed the Alien Mask being upside down.
- Rattler damage +10% again (now 21% above the original), Scattergun damage +10% again (also 21% above the original).

2.72.3
- After floor 15 the Tribute box menu no longer shows the donate option at all, only taking the $5.

2.73.0 - The arcade
- One arcade on every city floor now has an OPEN sign and can be entered through its door.
- Inside it looks like a real arcade: neon walls, a carpet floor and ten unplugged 3D arcade machines.
- An air hockey table sits in the middle with a monster on the far side. Look at the table and press the use key to play.
- Air hockey minigame: first to 5 goals, move the mouse to slide your paddle, Esc pauses (forfeiting counts as a loss).
- Win and you get $20. Lose and the monster steals one random power you own (nothing happens if you have none).
- You can play once per floor.

2.74.0 - 3D air hockey and the lab terminal
- The air hockey minigame is now 3D: a perspective camera looking down at the table, with real paddles, puck, rails and goals.
- Lab levels with acid bots now have a computer on a table. Press the use key next to it to try hacking the acid bots.
- Hacking minigame: a 2D platformer made entirely of green and white 0s and 1s. Reach ROOT before time runs out and without losing all 3 integrity. Stomp the virus 0s.
- Succeed and every acid bot on the level is destroyed. Fail (or give up) and their acid does 2x damage for the rest of the level. One attempt per level.

2.74.1 - Fixes
- Acid no longer hurts you while you are in the air (jumping).
- Floor 15: respawning after falling off a jump pad could put you right on top of a launch pad and fling you off again forever. You now respawn clear of the pad.
- Floor 15: the top-left HUD said "Vhaloru is dead" for the whole level. It now says "Vhaloru awaits" until he is actually defeated.

2.74.2 - Phase dash and Blink step swapped
- Phase dash now teleports you up to 7 tiles to wherever you are looking (stops short of walls). 6s cooldown.
- Blink step is now a quick dash in any direction you are moving (forward if standing still), briefly untouchable. 3s cooldown.

2.74.3 - Renamed Phase dash to Phase step, and Blink step to Blink dash.

2.74.4 - The sound test list now plays the right sound for Phase step (teleport) and Blink dash (dash) after the swap.

2.75.0 - The bandit hideout (floor 20)
- Floor 20 is now a unique level: a bandit gang hideout. You start in a dirt yard outside the compound, shoot your way past lookouts at the gate, then through the hall, the barracks, the armory and the mess hall.
- At the centre is the boss room, where the Bandit Leader waits: a bandit in heavy power armor with a huge cannon. He fires fast bursts of heavy rounds, and below half health he speeds up, fires longer bursts and adds spread volleys.
- Guards are armed bandits; the two bodyguards in the boss room are tougher elites.
- The Bandit Leader's model is in the model viewer, and "Hideout" is in the debug floor type list.

2.75.1 - Hideout tweaks
- The Bandit Leader is now only about 25% bigger than a regular humanoid (his hitbox shrank to match), and the spikes are gone from his shoulder pads.
- The yard and the outside of the building now look ruined (decayed fence, walls, containers, dirt and more rubble), while the inside is intact.

2.75.2 - Hideout
- The Bandit Leader fires 25% more often and his shots are 25% faster.
- You now spawn in a small isolated room south of the yard, with a short corridor leading north into the yard. The nearest enemy is about 15 tiles away.

2.75.3 - Fix: the minimap drew props (orange dots) far outside the map on any level that was not the standard 32x32 size (floor 20, coliseum, big custom maps). They now line up with the map.

2.76.0 - The Time Component (floor 20)
- A futuristic case stands at the back of the Bandit Hideout boss room. It does nothing until every enemy is defeated, then it starts shining.
- Press the use key next to it to grab the Time Component. The usual exit portal only appears after you do.

2.76.1 - Air hockey: after you score, the monster now gets behind the puck on its side and hits it back (before, it hovered in front of it and never served).

2.77.0 - Air hockey multiplayer (1v1)
- New multiplayer mode: Air hockey (1v1), on the same 3D table as the arcade minigame. Move the mouse to slide your paddle; the other player's paddle is orange.
- The host picks "Goals to win" in the lobby (1, 3, 5, 7, 10, 15 or 20). The server enforces it, and the console "limit" command works too.
- Exactly two players take part. Anyone else joins the Spectators and watches the table. Bots are not available, and the host always plays.
- The host's game runs the puck; if either player leaves, the other wins. Esc opens a menu without pausing the match.

2.78.0 - Battle Royale + the 256x256 Wilds map
 - New multiplayer mode: Battle Royale. Last one alive wins (one life each).
 - New 256x256 procedural map "Wilds": four styles of small buildings (with doors and loot rooms), trees, rocks and cover, hills and chests scattered around.
 - Everyone picks where to land on the map at the start (30 seconds). Picks are secret: nobody can see where others chose, the server only tells each player their own pick.
 - Everyone starts with fists only (10 damage per hit). Chests hold weapons or powers; the first player to open a chest gets it.
 - A shrinking storm closes in on the map and hurts anyone outside the safe circle. The minimap shows only your area and the zone.
 - Bots can be added to Battle Royale; they pick spawns, loot chests, flee the storm and fight.
 - Larger maps (more than 64x64) are supported by the renderer.

2.79.0 - Battle Royale: smooth hills, roofs, stairs, upper floors, windows, take-or-leave chests
 - Hills are now smooth slopes you walk up (no more blocky steps), shaded so you can see the lie of the land, and some are much taller (up to about 3 floors' height). The ceiling of the Wilds map was raised to fit them.
 - Every building in Battle Royale now has a roof (ruins stay open to the sky). Four to five styles: cabins, bunkers, two-storey barns with a hayloft, two-storey houses, and ruins.
 - Some buildings have stairs up the outside so you can climb onto the roof and shoot from up there. Roofs can hold a chest.
 - Two-storey buildings have stairs inside leading to an upper floor with its own chests.
 - Many buildings have windows you can see out of and shoot through (bullets pass, you cannot walk through).
 - Open a chest and the game shows what is inside (weapon stats or what a power does). Press F to take it or Backspace (or just walk away) to leave it. A chest you left stays where it is, with the same contents for everybody.
 - Other players and bots are shown at the right height on roofs and upper floors, and shots line up with them.
 - Works in both the graphics-card renderer and the software renderer. In the software renderer, things standing behind a hill can still show through it; the graphics-card renderer is exact.

2.79.1 - Battle Royale: jump onto low objects
 - You can now jump onto boulders, crates, barrels, sandbags, logs and hay bales (anything about knee to waist high) and stand or walk on top of them. Walking into them still blocks you; trees and taller things are still solid.

2.79.2 - Battle Royale: chests on hills
 - Chests on hills were drawn at sea level, so they sat buried under the ground and could not be opened from the surface. They now sit on the slope, and the open-chest reach check follows the terrain height.

2.80.0 - Battle Royale: biomes and a moving sun with shadows
 - The Battle Royale map is now split into three climates with wavy borders: the original plains and forest, a snowy winter region and a desert. Each has its own ground (snow, packed-snow trails, ice on the hills; sand, dark-sand trails, sandstone on the hills), its own trees and its own cover.
 - Winter buildings: log lodge (two floors), ice hut, metal research station (bunker) and snowy ruin, with snow-covered or metal roofs. Winter props: snow-laden pines, bare trees, snow boulders, climbable snowdrifts and ice crystals.
 - Desert buildings: adobe house with a flat roof, sandstone tower (two floors), bazaar with a tiled roof and a loft, and sandstone ruin. Desert props: cacti, palms, sandstone boulders and broken pillars, dry bushes. There are fewer trees in the desert, hills are higher in the snow and flatter in the sand.
 - The minimap shows each biome's colours.
 - The sun now moves slowly across the sky during a match (it rises higher and swings round, so shadows get shorter and turn). Players, bots, trees, rocks, crates, chests and buildings cast soft shadows on the ground in the opposite direction. Everyone in a match sees the sun in the same place.
 - Settings > Graphics has a new Sun shadows option (On/Off) if you want the extra speed back.
 - Both renderers draw the shadows. In the software renderer, shadows behind a hill can still show through it (same limitation as other objects).

2.80.1 - City floors always have one shop, one library and one arcade
 - A city floor could roll two libraries and no shop, because the shop signs were handed out at random. Every city floor now has exactly one shop (the one you can walk into), exactly one library and exactly one arcade; any extra duplicates are left as plain buildings.

2.80.2 - Shop prices
 - Regular powers in the city shop now cost $40 to $70 (was $40-$60). Rare powers cost $150, $155 or $160 (was always $150).

2.80.3 - Flamethrower fix
 - The round end cap on the back of the flamethrower's fuel tank flipped between green and bright red while firing or reloading. Its red band and green cap were drawn on exactly the same plane, so which one showed on top changed with the gun's tilt. The band now sits slightly behind the cap, so the cap stays green with a red ring around it.

2.80.4 - Random view spins
 - Occasionally the view would snap round by about 180 degrees on its own. The browser engine sometimes reports one huge mouse movement (at the moment the mouse is captured, when the window regains focus, or at random), and the game turned the camera by all of it. The game now ignores single impossible jumps and everything in the first moment after the mouse is captured or the window changes focus. Normal fast flicks still work.

2.80.5 - Gun appearance changing while firing or reloading
 - Many first-person weapons (pistol, scattergun, lance, twin fang, needler, marksman, flamethrower, reaper axe, quake hammer, daggers, ninja sword) have small parts that sit right on top of another surface: stripes, glow strips, plates, labels, grips. The game picked which one to show by depth alone, so as the gun tilted or kicked back, those parts flipped between showing and being hidden, or changed colour. Each of these parts is now always drawn right after the surface it sits on, so the gun looks the same in every pose. Some details that used to be hidden even while idle (for example the silver grip band on the Quake hammer) now show properly.

2.80.6 - Prop hitboxes and pit jumps
 - Bullets, pellets and projectiles now hit cars, crates, tables, bookshelves and cabinets by their real box shape instead of a big circle. Shots pass beside a car where there is no car, and over the hood where the car is low (the cabin is narrower and shorter than the body). Barrels, pillars, trees, rocks and other round props are unchanged.
 - Jumping over a pit on the regular generated floors no longer drops your view to the pit floor and snaps it back up. While you are in the air over a pit your height now stays level, and you only fall if you come down inside it. (Imported levels use their own physics and were not changed.)

2.80.7
- The OPEN sign on the doors between arcade, shop and library now all use the shop's green sign.
- Mineshaft floors now hide 1-3 secret chests instead of 0-2.
- Enemies that teleport (the ones with the purple ring) now show a spark burst where they vanish and where they land, and the ring is drawn so the ability is readable.
- You can now open the Tab (run status) and Escape (pause/settings) menus while on the reward/power pick screen.
- Deadly pits now have small decorative 3D spikes on the floor (no collision, purely visual).

2.80.8
- The teleporting enemy power is now called "phaser" (it was "blinker", which is the dash power); it shows in the enemy's power list. The purple ring added last patch is gone.
- A flash plays at both ends of any teleport: phaser enemies and your own Phase step.
- Enemies now attack a player turret instead of you when the turret is closer and in view (ranged enemies shoot it, melee enemies hit it).
- Pit spikes redrawn as a tidy bed of spikes on a base plate, one per pit cell, and only drawn when the pit rim would not hide them, so they no longer show over the land around the pit.

2.80.9
- Fixed pit spikes looking raised or floating in the software renderer: spike beds are now clipped against the pit rim, so they no longer draw over the land in front of the pit. Spike plates also fill their whole cell so the pit floor reads as one flat surface.

2.80.10
- Fixed pit spikes floating above the pit floor; they now stand on it.

0.1
- Version numbering restarted at 0.1. The title screen now says "Alpha" instead of "Pre-Alpha".
- Hardware (GPU) rendering was already the default; the comment in main.js that said otherwise is corrected.
- A fresh install (no saved resolution) now starts at the monitor's own resolution instead of 320x200. Anyone who already picked a resolution keeps it.

0.2
- Battle Royale: shots (and melee swings) can no longer pass through floors, decks or roofs, so someone on the ground floor can't hit someone on the upper floor and vice versa. Bots also no longer see targets through floors.

0.3
- The key boxes for powers at the bottom right now show a small icon of the power next to the key (phase step, blink dash, chrono, nova, barrier, turrets, medkit, well, dispenser, smoke, frag, and the rare powers). Boxes with a long key name (like a mouse button) stay text-only.

0.4
- Battle Royale: shots, melee swings and bot line of sight now use one true 3D ray cast over the same world the graphics card draws (terrain, wall tops, floors, roofs, and the wall above doors and windows), replacing the earlier floor-only check. Bullets now stop on hills, floors and roofs and can't pass through them, while shots through doorways and windows still work.

0.5
- Battle Royale: the rest of the grid-based physics and hit checks now use the real 3D world.
  - Frag grenades fly, bounce and land on the actual terrain, floors and roofs (they used to fall to a flat ground at height 0 and cap at a low ceiling), and thrown from a roof they start at your hand. Their blast respects height and walls, so it no longer hurts people on another floor or behind a wall.
  - Explosive-round splash, chain lightning and nova now need the target to be at a similar height with a clear line to it.
  - Jumping can no longer push your head up through a floor or ceiling above you.

0.6 - Ashen Knight fires 50% more projectiles in his second phase. New melee-only power "Deflect": while blocking, enemy shots are reflected at enemies for the shot's damage (3 s per block, then 6 s cooldown, cannot stack, never offered to gun builds).

0.11 - Blink dash now carries you over pits when you have climbing hooks. Melee blocking now cuts damage taken by 50% (was 33%).

0.12 - Deflect cues: your melee weapon glows blue and DEFLECT shows at the bottom middle while it is active; a small blue icon of your melee weapon shows there when it is ready again.

0.13 - DEFLECT text raised; the ready icon is grey during the cooldown and fills with blue from the bottom as it recovers.

0.14 - Air hockey: if the puck gets pinned in a corner/wall on the monster's side, it is now kicked back toward the middle instead of being pushed there forever.

0.15 - Air hockey: the field is split into four invisible quadrants; a puck that stays in one for 6 straight seconds resets to the middle. Puck hit sounds are rate-limited so they no longer stack into a loud noise.

0.16 - Floor 15: respawning after a fall now searches for a valid free spot near the checkpoint (not inside a wall or on a jump pad) and widens the search if you get put back repeatedly, so you can no longer end up unable to move.

0.17 - Stuck rescue for every mode and floor: if you are inside something for over a second, or hold a movement key for 2.5 seconds while boxed in on every side, you are teleported back to the last safe spot (or the nearest open one).

0.18 - Stuck rescue hardened: it now also fixes a broken (non-numeric) player position, skips remembered safe spots that have since become blocked, and searches fresh if a rescue does not hold.

0.19 - Floor 25 is now The Siege: a small stone castle with stairs up to the ramparts. Survive 5 waves of weak monsters (25% less health and damage, no modifiers), walk to the alien science lab, and the Skyfall Warden (a huge mecha bird that drops bombs, fires bolt fans and dives every ~6 seconds) attacks. New real-instrument orchestral battle theme. Textures on this map are 256x256 (the engine now supports 256px textures in both renderers).

0.20 - Floor 25: fixed the flickering stripes on the castle wall beside the gates (two overlapping wall faces were fighting each other).

0.21 - Floor 25: the castle gate facing the lab is now open and the other gate is shut (the keep moved to the north end); the lab entrance has steps up to it and is sealed by a force field until the waves and the Skyfall Warden are defeated.

0.22 - Floor 25: the landing pad beside the lab is now a solid, thicker platform sunk into the ground (it looked like it was floating and its dark sides vanished at some angles).

0.23 - Floor 25: closed the gap between the lab door steps and the lab floor (grass was visible through it).

0.24 - Floor 25: siege wave monsters now have 50% less health and damage than normal floor 25 monsters (was 25%).

0.25 - Twin daggers deal 25% more damage in singleplayer.

0.26 - Dungeon shop: about half of ordinary dungeon floors now have a small shop room built into the level: a table with 3 random powers for $50 each (press F next to it), a skull-masked shopkeeper behind it, and two little fires. Buying something makes the shopkeeper say "It's dangerous to go alone! Take this". Not on city, mineshaft, boss, special or multiplayer floors.

0.27 - Dungeon shop now only appears on floors with the Dungeon theme (not Lab, Foundry, Manor, Crypt, Cavern, City, Mineshaft, etc.).

0.28 - Cold snap model: rebuilt from pieces that only touch instead of three bars passing through each other, which removes the flickering/overlapping faces. Same shape and colors.

0.29 - The game keeps its 0.x version style (0.29, 0.30, ...). package.json now stores it in the three-part form the build tools require (0.29.0, 0.30.0, ...); the title screen, patches and updater show it as 0.29. Gameplay is unchanged from 0.28.

0.30 - After the floor 25 boss falls and the science lab opens, a prototype alien teleporter stands inside: step into the ring and a short 3D cutscene shows the alien home world (floating pearl cities, light bridges, a ringed planet). Space skips it. Floors 26 and up are alien versions of every level theme: pearl-and-crystal walls with glowing veins, a floating-spire skyline, alien props (seed pods, crystal spires, stasis capsules, hover-pods in cities), drifting light motes, and no humans. Not tested on a real GPU or with audio.

0.31 - Alien floors: the screen effect (light motes and violet vignette) is now much fainter. The alien city now matches the cutscene cities: pearl buildings with pointed roofs, no windows, and every building carries a sign in made-up alien script instead of English, so the only way to tell you can enter one is the green sign on its door.

0.32 - Alien city: each building now has one large pointed roof over its whole frontage (taller for wider buildings) instead of a row of small spikes.

0.33 - Alien city: every building now has a real 3D spire on top (stacked pearl tiers, a glowing ring floating around it and a glowing crystal tip), replacing the flat pointed shapes. Works in both renderers.

0.34 - Alien city: roofs now sit flush on the buildings (the base slab matches the building footprint instead of overhanging and looking like it floats).

0.35 - Alien floors: shops and libraries on floors 26+ are now alien (pearl-and-violet room, all signs and posters in alien script, an alien shopkeeper with a halo instead of a human cashier). Before this they showed the ruined look with leftover alien crystals, and the city spires showed through the shop ceiling.

0.36 - Alien shops: the wooden shelves, counter, side counter, cabinet and scratch-off stand are now pearl and violet with glowing trim and crystal tips.

0.37 - Enhanced mode: the shop shelves (and library bookshelves), the side of the counter and the cabinet now have much more detail: planked backs and sides with wood grain, grained shelf boards, metal brackets and nails, raised door panels with handles, a speckled top on the side counter, and a framed, grained cabinet.

0.38 - Shops (and libraries/arcades) now have a textured ceiling: speckled acoustic tiles in a grid with fluorescent light panels. It follows the ruined and alien looks on later floors. Works in both renderers.

0.39 - Air hockey vs. the Monster now pays $50 for a win instead of $20.

0.40 - Two new powers. Afterimage (rare): after you take a hit you cannot be hurt again for 1 second (instead of the usual brief 0.2s). Thinned herd (regular, stacks up to 5): one less regular enemy on every floor per copy.

0.41 - Super turret has its own look: gold armour plating, twin barrels with glowing muzzles, side ammo drums, a radar fin, a glowing base ring and a spinning ring of violet energy around the head, on top of being bigger than the regular turret.

0.42 - Super turret is now only 10% larger than the regular turret. Shots from both player turrets (and enemy turrets) now leave from the barrel tips. Shop power prices are now $40-80, and 2% of powers on the shelves are a SPECIAL DEAL at $30 with a SALE sticker.

0.43 - Startup in borderless fullscreen now waits for the window and game to finish loading before entering fullscreen (was done mid-load; reported to leave some PCs at very low FPS until the setting was toggled).

0.44 - Fixed very low FPS with a frame cap above 60: vsync and the frame limiter are now only switched off when the cap is above the monitor refresh rate (before, any cap over 60 did it). The setting is re-checked at every start, so existing installs correct themselves after one extra restart.

0.45 - Added the MIT LICENSE, THIRD-PARTY-NOTICES.txt (credits for the orchestral samples, font, libraries and trademark notes), a GitHub README.md and .gitignore. Updates now come from GitHub: the new Updater.exe downloads the newest game files from the latest release of github.com/EffDeeArr/ad (checked by checksum, old files backed up) and works from any earlier version. Patch-to-*.exe files are no longer made.

0.46 - The game now checks GitHub for a newer version when it starts and offers to install it (Update and restart / Later). It downloads the same checked game-files.zip as Updater.exe and backs up the old files. Turn it off with "autoUpdate": false in settings.json. Needs a game folder with resources\app (not an .asar).

0.47 - Scattergun damage +5%.

0.48 - Fan gun damage +5% in singleplayer (multiplayer unchanged).

0.49 - Reaper axe handle: removed the many dark lines and stripes along the handle; it is now a smooth wooden shaft with two plain grip wraps.

0.50 - Reaper axe: removed the dark facet lines from the metal parts too (collar, spike, pommel, hand pegs).

0.51 - Linux: BUILD.sh now builds a plain folder (dist/linux-unpacked) that can update itself, and PLAY-LINUX.sh prefers it; the AppImage is still available with ./BUILD.sh appimage. Single-file builds (AppImage, portable .exe) now show an "update available" box with a link to the download page instead of staying silent. Rebuild once with the new BUILD.sh to get the self-updating build.

0.52 - Chest model: a bit more detail. Domed lid, plank grooves, iron plinth, corner brackets, back hinges, rivets on the gold straps, and a lock plate with a keyhole and hasp; cursed chests also get small iron spikes on the lid.

0.53 - Reaper axe: the hand pegs no longer pass through the shaft (they are short stubs on each side), which fixes the overlapping/clipping look.

0.54 - Reaper axe: replaced the wide box at the top of the shaft (it stuck out of both sides with the shaft clipping through it) with a round mount ring.

0.55 - Reaper axe: the shaft now goes into the iron collar and comes out the other end cleanly (it no longer overlaps the collar faces).

0.56 - New hat: Oni Horns (Rare), two stubby yellow ridged horns. It drops from loot boxes like the other hats.

0.57 - New hat: Cat Ears (Uncommon), black ears with pink insides on a thin headband. Drops from loot boxes.

0.58 - Cat Ears: the black part is larger so they read clearly as cat ears.

0.59 - Debug mode: new "Cutscene viewer" button on the main menu under Sound tester. It plays the alien home world, the space elevator, the station crash (escape and left-behind), the ending and the coliseum boss entrance on their own, and returns to the list when each one ends.

0.60 - Settings > Audio now has a "Custom Music" submenu. The general YouTube link moved into it, and each level theme (Dungeon, Cavern, Lab, Crypt, Manor, Foundry, City, Mineshaft, Coliseum, Bandit hideout, Space station, Castle, Shops) can have its own YouTube link that plays instead of the general one on those levels.

0.61 - Custom Music now replaces the game's own music on levels that have it (Shops, Space station, Castle, Coliseum) so the two never play over each other. Those levels are marked with an asterisk in Settings > Audio > Custom Music.

0.62 - You can no longer jump inside shops (your head went through the ceiling).

0.63 - Added a silly "no jumping" sign on the shop wall next to the exit.

0.64 - The shop no-jumping sign now says "NO JUMPING" so it is obvious what it means.

0.65 - Shop no-jumping sign is shorter and sits closer to the exit sign.

0.66 - Arcade: if The Elder Scrolls: Arena is installed in your Steam library, one arcade machine is switched on and runs it (DOSBox inside the game window; desktop app only; saved games are kept between visits; F12 leaves the machine).

0.67 - Arcade Arena machine now uses the game's own DOSBox config (.conf files in its Steam folder: settings and launch commands) instead of guessed settings, keeps the game folder layout, and has a Log button to show what DOSBox is doing.

0.68 - Arena machine: fixed the game's own mount lines (drive written as "C:") not being resolved, which left Arena unable to start.

0.69 - Arcade: the other machines have plain black screens. Playing Arena now shows a first-person view of you at the machine with the game running on its monitor; Alt+Enter (or the Fullscreen button) switches to the full-window view and back.

0.70 - Arena machine: removed the long help text from the fullscreen top bar so the bar is slim.

0.71 - Title screen: click the version number in the bottom left to open the patch notes (from the readme). It shows what changed since the version you were on before your last update, with a button to show every version.

0.72 - Profiles: a player's equipped title now shows in front of their name on their profile card (lobby click and your own preview).

0.73 - Desktop: closing the game now makes sure every game process ends (cleans up Steam, Discord and the lobby server, then force-exits after 1.5 seconds), to stop leftover ghost windows in Alt-Tab.

0.74 - Floor 25: fixed the lab doorway staying blocked after beating the Warden. A glowing trim strip ran straight across the open door at head height and was solid; it now stops at the doorway.

0.75 - Arms Race: a kill no longer swaps your gun mid-round; the new gun arrives with the next round (a feed line tells you which). Battle royale and One in the Chamber: after you are eliminated the kill replay now ends and you can spectate the remaining players (Q / E or the mouse buttons to switch); before, the replay looped forever.

0.76 - Game mode names now use proper capitalization everywhere (Battle Royale, Capture the Flag, Team Deathmatch, Bomb Defusal, Air Hockey and so on).

0.77 - Air Hockey multiplayer: the host can now move to the Spectators and watch. The first player then runs the table for the match.

0.78 - Multiplayer: a player's equipped title now shows on their profile card in the lobby (it was only sent during matches before). The game music is 25% quieter; the Music slider keeps its range, so its 100% is the new, quieter level.

0.79 - Hearts are no longer wasted: at full health you walk over them and they stay. New regular power Heart overflow: a heart eaten at full health gives +2 Overhealth (max 20; with Overheal too, the max is 40). Messiah now lasts 8 seconds instead of 5.

0.80 - Power names use proper capitalization everywhere (Phase Step, Gravity Well, Frag Grenade, Quick Hands and so on).

0.81 - New title: Withered (a Rare loot box title).

0.82 - Singleplayer: when an enemy kills you, the results screen shows its name, health, damage, speed and traits, plus a small map with you and the killer marked (flashing red ring). Settings > Controls has a new Crosshair editor: line length, gap, thickness, center dot, circle, opacity, color, outline and T shape, with live previews, saved automatically.

0.83 - Floor 25: the level label in the top left says Castle (it said the underlying cave theme), and gravity in the castle is now normal instead of a quarter of normal, so jumps are no longer floaty.

0.84 - Floor 25: the Skyfall Warden boss is no longer upside down (talons hang below, head on top).

0.85 - City floors: the shop, library and arcade doors can no longer be wiped out by alleys or by rubble on ruined cities, so every city floor has an enterable shop (and library). Shops on alien cities now have the green sign on the door like the arcade and library.

0.86 - Shops: the SALE sticker on special deals now shows all four letters (the L was missing).

0.87 - Shops: the power items on the shelves (Second Opinion, Plated Vest and others) no longer flicker with lines while you move; overlapping flat faces are pushed apart by a tiny amount, so the designs look the same.

0.88 - Plated Vest is capped at 6 copies. Heart Overflow description shortened. The Tab menu with lots of powers now lays them out in columns across the full width (with a visible thin scrollbar), so long lists are no longer cut off.

0.89 - Tab menu with many powers: the Weapon and Run box is now full width (side by side), so there is no empty space beside it.

0.90 - Weapons: parts of gun models that shared the same flat surface (Lance, Pistol, Scattergun, Twin Fang, Needler, Marksman, melee weapons and more) caused flickering lines and bits appearing or vanishing while moving or reloading. Overlapping surfaces are now pushed apart by a tiny amount so the models look the same.

0.91 - Weapons: hidden inner faces of gun models (like the Lance top strip, which popped over the body while reloading) are now removed, so they can no longer show through while moving or reloading.

0.92 - Stat powers that rolled a good value (like Plated Vest) are now labelled Uncommon instead of Rare, since real Rare powers are a separate thing.

0.93 - Alien levels: chests have their own look. A pearl reliquary with a glowing hex body, sigil panel and a floating gem, and a cursed version that is dark with a slit-pupil eye, crystal thorns and magenta glow. Both are also in the model viewer.

0.94 - Patch notes: the in-game patch notes list now shows every version again (0.84 to 0.93 had been merged into the 0.83 entry by a formatting slip).

0.95 - Executioner is now capped at 3 copies (it was 4) and Corpse Bomb at 4 copies.

0.96 - Enemy counts keep growing after floor 32: floor 33 has 33 enemies, floor 34 has 34, and so on up to 50 (boss floors are unchanged).

0.97 - Ghost windows: the Arena arcade check used to scan your Steam folders on the same thread that keeps the game window responsive, right at start-up, which can make Windows treat the window as "Not Responding" and leave ghost windows in Alt-Tab. That work now runs on its own thread and starts 8 seconds after launch. Closing the game also hides the window instantly and force-ends the process after 2.5 seconds if it has not exited.

0.98 - Past floor 50, enemy health and damage grow 6% per floor instead of 5%.

0.99 - Vhaloru: the time you have to look away from the Unblinking's gaze attack is cut in half (2.7 s to 1.35 s in phase 1, 2.1 s to 1.05 s in phase 2), and the charging whine is shortened to match.

0.100 - The locked Alien Mask in the collection now shows "???" instead of the Ashen Knight hint ("Beat the floor 10 Knight"), like the other secrets.

0.101 - New hat: Wel Worn Helm (Rare, from loot boxes). A battered dark navy helm with a notched crest, a red brow plate, glowing green eye slits, a silver jaw guard and swept side guards.

0.102 - Wel Worn Helm rebuilt to follow your sketch: a beveled crest block with a hole running down over a red almond brow plate, a thin blade behind it, big swept side flares, slanted green eyes, an open grille mouth and a chin block, with many more polygons than before.

0.103 - Wel Worn Helm is back to its original look. It can no longer be found in Loot Boxes and only shows in the cosmetics menu once you own it.

0.9.1 - Chain Lightning is now capped at 4x. The game version number is now 0.9.1.

0.9.2 - Powers in the Tab menu now show (Max) in red when you have the most of them you can.

0.9.3 - Vhaloru has 5% more health.

0.9.4 - Three new capes in Loot Boxes: Frostmantle, Toxic Cloak and Sunforged Mantle.

0.9.5 - Multiplayer: the Barrier Projector now has 150 health and loses health from the damage of each shot that hits it, instead of breaking after a number of hits. Battle royale chests no longer hold powers that do nothing there (Climbing Hooks, Thinned Herd, Second Opinion, Heart Overflow and Corpse Bomb).

0.9.6 - New High texture quality: 256x256 textures made to look like real materials instead of drawings, with per-brick and per-tile variation, grime, cracks, chipped edges, surface relief and muted natural colours, on walls, floors, ceilings, shops, arcades, stations and every floor type. The texture options are now called Low (was Classic), Medium (was Enhanced) and High. High costs more memory and a longer load at the start of a floor, so it is meant for faster computers.

0.9.7 - The shop ceiling and walls are slightly taller, so the top of the scratch-offs sign no longer pokes through the roof.

0.9.8 - New anti-aliasing option (Settings > Rendering): Off, 2x, 4x or 8x MSAA to smooth jagged edges. It only shows when Hardware (GPU) rendering is working. Also shortened a lot of the longer text in the settings menu.

0.9.119 - Singleplayer: your jump is half as high. Multiplayer and deathmatch jumps are unchanged.

0.9.118 - Ordinary floors (not the city, and not floors 5, 10, 15, 20 and 25) now have a real ceiling that matches the level's theme, and their walls are 50% taller.

0.9.117 - Weapon movement: every weapon (guns and melee) now bobs with your walking speed, sways against strafing and walking, floats slightly in the air, dips when you land and breathes gently when you stand still.

0.9.116 - Smoother movement: you now ease up to full speed and ease to a stop instead of snapping, you keep some momentum in the air, you slide along walls without catching, the weapon bob follows your real speed, and the camera dips slightly when you land.

0.9.115 - Skyfall Warden: it now takes off again 5 seconds after landing on its perch. A shared timer in the enemy code kept resetting its perch timer, so it stayed down forever.

0.9.114 - Patch notes: fixed the list stopping early and entries being merged together. They are now ordered by release date and time (newest first) instead of by version number.

0.9.113 - Native renderer fix: its shader list was out of date, so the game's shaders were rejected and the native renderer never showed a picture. The list is rebuilt for the current game. It also no longer turns itself off just because you quit from the menu early: it counts as working after 8 seconds, gets one more try after a bad start, and an earlier automatic turn-off is retried once.
0.9.112 - Settings > General: new Show Debug UI option. A strip along the top of the screen shows the frame rate, whether the native renderer is working, DLSS and ray tracing status, and when and why anything failed.
0.9.111 - The renderer fallback now needs 60 frames in a row to fail (was 30), and Settings keeps showing the Graphics API you picked even if the native renderer could not start (the reason is shown under it).
0.9.110 - Native renderer: the game now ignores the old ANGLE "Vulkan" graphics API while the native renderer is on (it could stop the native renderer from starting), and Settings shows why the native renderer turned itself off.
0.9.109 - Skyfall Warden: its perch now really lands. It flies to a spot beside you, sets its talons on the floor and sits completely still for 3.5 seconds (it was hovering a few feet up and drifting), so melee builds can hit it.
0.9.108 - Settings: the Rendering and Native renderer sections are merged. Pick "API: Vulkan (native renderer)" in the Graphics API list and the DLSS and ray traced shadow options appear right there.
0.9.107 - Monster blood is now green (hit splatters, the death explosion, wall and floor splats, and the pool), and a dying monster leaves one pool, right where it died, instead of several (one had ended up on top of a wall). Human blood stays red.
0.9.106 - Monsters now burst in a gory mess when killed: flying chunks, a spray of blood in every direction that splatters walls and floor, and several pools (bigger for big monsters and bosses). Humans, the robot, knights, aliens and power armor are unchanged.
0.9.105 - Fixed Energy Shield draining every shield you had, from any source (shop shield, Shield Dispenser, Super Shield...). Now only the Energy Shield's own 50 (+25 per copy) drains, 1 per second; shield from other sources stays.
0.9.104 - The ability key boxes at the bottom right now use short labels (LS, RS, LC, RC, LA, RA, Spc, Ins, Del...) so long key names no longer overflow and overlap the icon.
0.9.103 - You can now put several actions on the same key. Settings > Controls warns you (a message when you set it, an amber key button, and a Shared keys line at the top), and pressing the key does all of them. Before, binding a key that was already in use swapped the two actions, and power overrides refused keys that were taken.
0.9.102 - Your magazine (and your second weapon's) is refilled when you move on to the next floor. The Loot Box messages now say to open them from Customize Profile > Cosmetics.
0.9.101 - Taking Extended Mags now fills your magazine to the new maximum straight away (and your second weapon's, if you carry one), so you do not have to reload first.
0.9.100 - The Loot Boxes button in Customize Profile is now called Cosmetics (and the screen is titled Cosmetics). When you have unopened Loot Boxes the button turns gold and says how many.
0.9.99 - Customize Profile redesigned: Loot Boxes button now at the top next to your name, and Skin, Spray and Background are tidy cards with short descriptions, a preview, a status line and Upload / Remove buttons (Template for skins).
0.9.98 - New Encyclopedia on the main menu (where Loot Boxes was): a page for every weapon, power and boss/enemy type, with a rotating picture, value ranges, falloff, how powers stack and their maximums, plus Terms (Blazing, Frostbitten, Explosive, weapon words, minor mods, status effects) and Basics. Numbers are read from the game's own tables. Loot Boxes moved into Customize Profile (the main menu's Customize Profile button turns gold with a count while you have unopened boxes).
0.9.97 - Weapon pick screens (solo, co-op, deathmatch) now show a short plain-words line under each weapon's name, e.g. "Close-range shotgun blast", so new players get what each gun is like before reading the numbers.
0.9.96 - A single error while drawing a frame no longer switches the game permanently to the plain software renderer (which is what makes flat blood splatters stand up half-buried and drops all shadows). The game now skips that frame and only gives up after 30 errors in a row; the last error is kept in window.GLR_LASTERR. If ground splatters or character shadows still look wrong, send native\bin\arb-rt-log.txt.
0.9.95 - With hardware ray tracing on, shadows from moving things are now done by the ray tracing itself: each frame the characters' real 3D models, props, chests and turrets (and a solid body for monsters drawn as flat images) are added to the ray tracing scene, so they cast and receive shadows on everything. Needs the native renderer rebuilt (PUBLISH.bat does it) and the updated shader pack. Without ray tracing the 0.9.94 shadows are used.
0.9.94 - Characters now cast real traced shadows: the player, monsters, humans and allies are tested by the shadow rays (hardware ray tracing and the normal path alike), so their shadows fall on the floor, walls and props. The simple ground shadows from 0.9.93 are now only used when light shadows are off. Updates the native shader pack.
0.9.93 - The player, monsters, humans, allies and turrets now cast shadows on the floor on every normal floor (stretched away from the sun or the nearest lamp, plus a small dark patch under the feet), so they no longer look pasted on, with or without ray tracing. Shadows are a bit subtle on very dark floors.
0.9.92 - Fixed the Coliseum (and any floor after a lit one) being mostly dark with odd window-shaped light patches when ray tracing is off: the shadow grid from the previous floor was being reused instead of the new floor's.
0.9.91 - The Second Weapon power now has a 3D shop model (two pistols pointing opposite ways) when it is on a shelf.
0.9.90 - The three weapons offered by the Second Weapon power are now three different weapon types, and never the type you are already holding.
0.9.89 - The Second Weapon power now lists your two weapons at the bottom right, the same place and style as Bomb Defusal (it sits just above your ability boxes when you have abilities).
0.9.88 - New rare power, Second Weapon (singleplayer and co-op): carry two weapons. When you take it you pick one of three rolled weapons, like at the start of a run. Swap between them with the scroll wheel or the 1 and 2 keys; both weapons are listed on the HUD.
0.9.87 - Co-op: players in the same shop, library or arcade now see each other and share the same shelves (the same stock for everyone, and an item someone buys is gone for the others). Dismemberment now works in co-op and every player sees the same limbs come off. Limbs now match the kill: a leg shot takes a leg, a body shot an arm, a head shot the head (blade kills still take limbs at random). Hosts need this version.
0.9.86 - Co-op fixes: the shop, library and arcade can now be entered in co-op (each player shops on their own, is hidden from the others while inside, and earns money from monster kills); the moving yellow squares on the co-op minimap are gone (teammates already show as green arrows); boss floors in co-op now offer the rare power choices; deaths to monsters in co-op no longer say 'killed by the void'. Hosts need this version for the shop-hiding to reach other players.
0.9.85 - All power cooldowns reset to ready when you go through the next floor portal. Ember Rounds can now be taken up to 5 times while you hold the Flamethrower, each stack adding another burn of damage.
0.9.84 - Burn effects now stack: a Blazing weapon and Ember Rounds each burn on their own, so an enemy can have up to 2 burns at once for double burn damage.
0.9.83 - Fixed the lag when deflecting a lot of projectiles at once (deflect sounds and sparks are now capped per frame and the target search runs once per frame). Acid robots no longer bleed: they throw sparks instead of blood and leave no blood pool.
0.9.82 - Dismemberment: a killing blow can now take limbs off humanoid enemies and players. Blades slice arms, legs and heads off, big overkill (shotguns, blasts) tears them away, and a shot can take off the part it hit. Each severed limb tumbles and bounces as its own piece, the stump bleeds, and the pieces stay on the floor. Turned off with the ragdoll setting.
0.9.81 - The end of run screen now has three options: Roll again, Main menu and Close game.
0.9.80 - Fixed Vhaloru's (floor 15 boss) regular projectiles: they now launch from chest height, aim at you, and show as large glowing plasma orbs instead of tiny dim dots near the floor.
0.9.79 - New blood: hits and kills spray droplets that fly, land and stain the ground (flat splatters turned the way they were thrown) and walls (with drips); bodies leave a pool. Replaces the single round sprite.
0.9.78 - City floors are now lit by street lamps along the kerb (spaced out, never in front of doors or at junctions) instead of wall lamps on the buildings.
0.9.77 - Opened chests no longer leave an invisible solid block behind on True 3D levels. The shop is now lit by its ceiling light panels (brighter, more even).
0.9.76 - Fixed the Crimson/Ashen Knight's shockwave projectiles vanishing the instant they appeared on True 3D levels (floors 5 and 10).
0.9.75 - Coliseum: monsters (including the summoner's minions) now only appear on open arena sand, never in the stands or walls. The sun now lights the coliseum and casts shadows (Lighting setting). Cursed chests no longer push a power past its max.
0.9.74 - Tab menu with many powers: wider 4-column list that uses the whole screen, taller, with a clearly visible scrollbar (also on the multiplayer scoreboard).
0.9.73 - Escape in Settings goes back (to the pause menu or title); Escape again closes the pause menu.
0.9.72 - Settings groups now fold open and closed (all closed by default, remembers what you opened). Death screen map now fills its square on small maps.
0.9.71 - Settings redesigned: grouped cards, one row per setting (name left, control right), short hints instead of paragraphs, cleaner sliders and checkboxes. All options unchanged.
0.9.70 - Dynamic lighting now also affects the player's gun and hands (ambient darkening plus nearby lights, muzzle flash included), and monster sprites now get the same ambient level and light strength as the 3D surfaces. Humans and props were already lit.
0.9.69 - Hardware ray tracing (optional, native renderer): Settings > Native renderer > Ray tracing. The graphics card's ray tracing hardware now does the dynamic-light shadows (soft edges) instead of the software voxel version, using the level's real triangles. Needs a ray tracing card (RTX etc.) and the lighting setting Lights + ray-traced shadows. Also: the scratch-off Decline button is smaller.
0.9.68 - Fixed the coliseum gate (floors 5 and 10) staying shut during the boss cutscene and then jumping open when it ended; it now rises during the cutscene.
0.9.67 - Scratch-off tickets: when a ticket wins, a Decline prize button appears at the bottom right of the ticket. The prize is only handed over when you close the ticket, so you can turn it down.
0.9.66 - Fixed the coliseum gate (floors 5 and 10) showing as a block of yellow hazard stripes instead of stone.
0.9.65 - Native renderer: the log (native\bin\arb-rt-log.txt) now records where its window is and what covers it, to track down a case where the 3D picture did not show behind the game's menus and HUD.
0.9.64 - Native renderer now draws straight to the screen in its own window behind the game (borderless fullscreen while on), which removes the stutter from copying every frame through the browser. Adds optional NVIDIA DLSS (Settings > Native renderer > DLSS On/Off + quality; needs an RTX card). Hardware ray tracing is not in yet. Untested on real hardware at release: send native\bin\arb-rt-log.txt if anything looks wrong. The update from GitHub now includes the native renderer (arb-rt.exe, nvngx_dlss.dll, shader pack), so players need no extra steps.
0.9.63 - Optional native Vulkan renderer (experimental, Windows). Settings > Rendering > Native renderer draws the game with a separate Vulkan program (native/arb-rt) instead of the browser; run native\BUILD-NATIVE.bat once to build it. It replays the game's real frames pixel-for-pixel in tests and falls back to the normal renderer on any problem. It already carries the motion vectors and jitter DLSS needs, but DLSS and hardware ray tracing are NOT switched on in the game yet (the probe showed both work on an RTX 4070 SUPER).

0.9.62 - Software rendering is gone: the game always uses your graphics card (if the GPU process crashes on Windows it retries once with a different graphics API). New: real light sources. Lamps now sit on walls and light the area around them, and explosions flash. Settings > Lighting adds optional ray-traced shadows (done in the shader, works on any card, off by default). Also added the start of the optional native renderer in the native folder, for real NVIDIA DLSS and hardware ray tracing on cards that support them. It is only a test tool for now (BUILD-NATIVE.bat, RUN-PROBE.bat) and is not used by the game yet.

0.9.61 - Fixed sprays (K) doing nothing on the singleplayer maps that run in the true 3D engine. The check that stops you spraying on the floor was reading the floor inside the wall and always refusing; it now reads it just in front of the wall.

0.9.60 - Ragdoll bodies can no longer pass through themselves. Legs, arms, torso and head now push each other apart, so a leg cannot go through the torso, legs cannot cross through each other, and limbs have to rest on or against the body instead.

0.9.59 - Real 3D people, fuller ragdolls, melee enemies. (1) Human models (you, other players and human enemies) are now real 3D models with the skin wrapped on them, hats and capes included, when they are close; far away they stay flat pictures. Team outlines still work. Settings > Rendering > Real 3D characters turns this off. (2) Ragdolls use the whole skin and all cosmetics, and follow the ground so they no longer sink through city sidewalks and kerbs. (3) About one in four singleplayer human enemies now fight with a melee weapon (axe, hammer, sword or daggers): they run at you and swing. Knights, aliens, robots and foxes are unchanged.

0.9.58 - Ragdoll and chest fixes. (1) Ragdolls no longer slide through walls in the true 3D levels (city buildings and every other level); they now stop against walls and slide along them. (2) Ragdolls now look like the person they came from: characters with a custom skin keep their face, hair, sleeves, hands and trousers colours from that skin, and everyone gets the right hair style and colour and the team-colour marker. Hats and capes are still not shown on ragdolls. (3) Battle Royale chests no longer leave an invisible solid block behind once they are opened or taken; you and the bots can walk through the spot.
0.9.57 - Fixed shots missing or doing no damage against people. After the first hit on a human enemy or another player, the hit reaction (the flinch) overwrote that character's hit radius, so every later shot at them passed straight through until they were killed or reloaded. Hit reactions still play, and shots now land every time you hit.
0.9.56 - True 3D levels, final stage. Battle Royale is now a true 3D world too (hills, buildings with doors, windows, decks, stairs and roofs, trees, rocks, sun shadows), so every level and mode in the game now runs on the one 3D engine. Settings > Graphics > True 3D levels still switches back to the old grid and terrain engines if something looks wrong.
0.9.55 - True 3D levels, second stage. Deathmatch, team modes, CTF, co-op, Bomb Defusal and every other online mode now run on the true 3D levels, bots included. The Foundry crushers are real moving 3D slabs, the Coliseum (arena, seating, rising gate, boss intro) is 3D, and the shops, library and arcade are 3D. Only Battle Royale still uses the old terrain engine. Settings > Graphics > True 3D levels turns the whole thing off.
0.9.54 - True 3D levels, first stage. The normal singleplayer floors (Dungeon, Cavern, Lab, Crypt, Manor, Mineshaft, City, Hideout) are now built as real 3D worlds, the same engine the imported maps use, but look and play the same as before: same layout, textures, fog, props, pits, acid, jumping, enemies and shots. Still on the old flat grid for now: online and deathmatch games, the Foundry, Coliseum, Battle Royale and shop levels. Settings > Graphics > True 3D levels turns it off if something is wrong.
0.9.53 - Killcams: bullets no longer hang in the air; they keep flying and vanish like they do in the game. Skyfall Warden (floor 25): every 12 seconds he lands next to you and perches for 3 seconds, unarmed and mending 10 HP per second, so melee weapons can reach him, then takes off again.
0.9.52 - Hit reactions: when you shoot a human (enemy or another player) the part you hit reacts. An arm whips away, a leg buckles and the body dips, the head snaps back, and a chest hit makes the whole upper body fold, then it springs back. Ragdoll bodies now rest on raised ground such as the city sidewalks instead of sinking into it, and are thrown a little harder than in 0.9.51 (about 20% more).
0.9.51 - The fan gun and the pistol now kick when they fire (their recoil was never triggered in 0.9.49), and ragdoll bodies are thrown a bit less far.
0.9.50 - Fixed a bug from 0.9.49 that made the gun turn into a flat 2D drawing whenever you reloaded. Reloads are 3D again.
0.9.49 - Ragdoll bodies: when a human dies (singleplayer, co-op and multiplayer) their body is now thrown by the hit, tumbles and settles on the floor instead of vanishing. There is a new Ragdolls option in Settings to turn it off. Gun feel: every shot now kicks the gun back and recovers with a smooth spring, the gun lags a little behind your mouse movement, the pistol slide cycles and locks back when empty, the marksman rifle cycles its operating rod and pings when its clip runs out, and the sniper rifle works its bolt after each shot. Pistols, the marksman rifle, the rattler and twin fangs eject brass. Reloads now play matching sounds (magazine out and in, slide release, shells, bolt, energy cells, fuel tank).
0.9.48 - Gun reload animations rebuilt. Every gun now has its own smooth, keyframed reload instead of one shared tilt: the pistol drops its magazine and slaps in a new one with a slide release, the coach gun breaks open, ejects its shells and thumbs in new ones before snapping shut, and the Needler, Rattler, Lance, Hand cannon, Marksman, Sniper, Flamethrower and Fan gun each get a support hand that brings in the right part (crystal cartridge, drum, energy cell, speedloader, clip, magazine, fuel canister) at its own angle. All moves ease in and out. Twin fangs and melee weapons keep their previous animations.
0.9.47 - Co-op: the host now tells everyone which monsters are still alive every 1.5 seconds, and any copy that is not on the list (because its death message was missed) is removed. This fixes dead monsters showing up for another player that you cannot hurt.
0.9.46 - Co-op: monsters now use the same floor-by-floor health scaling as singleplayer, with 33% more health for every additional player (replaces the flat +33% from 0.9.44).
0.9.45 - Co-op: the death screen no longer says "You fell into a pit" for deaths that had nothing to do with a pit (the message from an earlier fall was never cleared), and damage that was still queued from the previous floor is dropped when a new floor starts.
0.9.44 - Co-op: monsters and bosses have 33% more health.
0.9.43 - Co-op: players who are not the host took far more damage than the host from the same attacks (every pellet of a shotgun blast, every tick of fire, landed in full because they had no invulnerability after a hit). They now get the same 0.2 s of protection after each hit as the host, which should stop the sudden deaths.
0.9.42 - Multiplayer lobby: the Wingman layout option now appears only after the host has imported a CS:GO map that has one (ticking it re-imports the map), instead of being there all the time.
0.9.41 - Halloween mode: the shop gets cobwebs, a purple tint and spooky decorations, the shopkeeper becomes a witch, and a pumpkin sits on the main menu.
0.9.40 - Halloween mode: from October 24 to October 31 (singleplayer only) props look spookier with a purple tint and cobwebs, pumpkins, ghosts, tombstones, bats, candles, skulls and spiders are scattered around every map, human enemies wear a skeleton skin, and quiet silly spooky music plays on maps that have no music of their own. Set ld_hal to 0 in local storage to turn it off.
0.9.39 - Custom CS:S maps (e.g. wingman maps): when a map lists more bomb sites than are reachable from the spawns, the unreachable ones are dropped, so Defuse mode only uses the real site.
0.9.38 - Counter-Strike: Source maps (de_dust2): the window patches are set slightly behind the wall face, so they no longer flicker or draw lines where they overlap the wall.
0.9.37 - Counter-Strike: Source maps (de_dust2): windows are now found from the wall faces themselves (a hole fully ringed by wall), and every window that lets you look into ground nobody can reach is shut with a patch of wall. Doorways you can walk through, and windows onto reachable ground, are left alone.
0.9.36 - Counter-Strike: Source maps (de_dust2): removed the window walls added in 0.9.34 and 0.9.35 (they put walls in open areas). The gate and door walls from 0.9.33 stay.
0.9.35 - Counter-Strike: Source maps (de_dust2): every window you can see through into somewhere nobody can walk (inaccessible rooms, sky) is now shut with a plain wall, so they can't be used to look through the map. Windows that look into ground you can reach stay open.
0.9.34 - Counter-Strike: Source maps (de_dust2): windows you could see empty sky through from the ground are now shut with a plain wall (drawn only). Windows that look into a room or onto the street stay open.
0.9.33 - Counter-Strike: Source maps (de_dust2): the big gates and doors (the temple entrance and the wooden doors) are now closed with a plain wall sized to the gap they sit in, instead of the earlier guess-based walls. Drawn only; walking is unchanged.
0.9.32 - The small (Wingman) layout option now only appears after a Counter-Strike: Global Offensive map that has one has been imported.
0.9.31 - Counter-Strike: Source maps: the new gate-cover walls were showing up as tall slabs in open areas. They are now only added where there really is a wide gap you can see empty void through, and short pieces that end in open air are dropped.
0.9.30 - Counter-Strike: Source maps (like de_dust2): big gates and doorways you could see right out of the map through are now covered with plain walls (drawn only, you still walk exactly where you did before). Nothing else about how these maps load changed.
0.9.29 - Fix: the Counter-Strike changes (map cropping, movement mask, simpler terrain, hidden-room culling, prop changes, no textures, lower resolution) now apply only to Counter-Strike: Global Offensive maps. Counter-Strike: Source, TF2 and other Source maps import exactly as they did before 0.9.10.
0.9.28 - Counter-Strike maps no longer load the Counter-Strike textures (the game draws its own stand-in textures); prop models are still read from the game files.
0.9.27 - Counter-Strike maps: prop models are cut to about half their triangles on import (shortest edges merged; open edges kept and no triangle turned inside out).
0.9.26 - Imported maps: flat terrain patches are built from far fewer triangles (any patch that stays within a unit and a half of the original keeps only the rows and columns it needs; collision is unchanged). Inferno went from 95,000 to 43,000 triangles.
0.9.25 - Counter-Strike maps are now drawn at no more than 960x540 worth of pixels.
0.9.24 - Counter-Strike maps are drawn at no more than 960x540 worth of pixels (stretched to the window) for speed; your own resolution comes back when you leave the map.
0.9.23 - Counter-Strike maps, framerate: Counter-Strike textures are drawn at a quarter of the pixels (64x64), and walls, floors and terrain in parts of the map you cannot see into are skipped using the map visibility data (checked pixel for pixel against drawing everything).
0.9.22 - Imported maps, framerate: props are drawn nearest first and a prop whose whole outline is hidden behind walls that are already drawn is skipped, so only props you can actually see (plus a margin at the screen edges) cost anything.
0.9.21 - Counter-Strike maps, framerate: props in rooms you cannot see into (checked against the map visibility data) and props too small to see at a distance are no longer drawn. Nothing is removed from the map.
0.9.20 - Counter-Strike maps: no limit on how many props are built (it used to stop at 5000 props / 170000 triangles). The solid black "tools/toolsblack" surfaces that fill some openings are drawn now instead of left empty.
0.9.19 - Counter-Strike maps: doors, gates, windows, shutters and wall pieces are built before small clutter, so they are no longer cut off by the prop limit (that left doorways open). Terrain and plaster pieces inside the map are no longer trimmed away either.
0.9.18 - Counter-Strike maps: walls and floors that were see-through when viewed from one side are now drawn from both sides (no more holes), scenery near the edge of the map is kept instead of cut off, and the earlier foliage/prop removal stays undone.
0.9.17 - Imported maps: Counter-Strike walls and floors are no longer dropped when the middle of a large face falls outside the kept area (that caused see-through holes). Trees, wire and other props are drawn again instead of being left out.
0.9.16 - Imported maps: props whose texture cannot be read, or that have cut-out parts (trees, leaves, wire), are left out instead of being drawn as scrambled grey cards.
0.9.15 - Imported maps with many props: the props are now chosen biggest first (the old limit kept whichever came first in the file, which on Counter-Strike maps was mostly small clutter), up to 5000 per map, and the import message says how many props were placed.
0.9.14 - Prop models from the game files now load. The reader for the model mesh files (.vtx) looked for its tables four bytes too early, so no model could ever be read; it also now copes with the larger strip headers that Counter-Strike: Global Offensive models use and with models that have no bounding box. When a model still cannot be read, the import message says why.
0.9.13 - The lobby's map import message now also says whether the Counter-Strike game files were found, how many prop models were loaded, and whether the Wingman layout is on.
0.9.12 - Counter-Strike game files: the search for Counter-Strike: Global Offensive now looks inside every Steam library folder it can find (a few levels down, so a different folder layout still works), tries again when you open Settings or import a map instead of giving up after the first miss, and says in Settings and after an import whether it found the files and how many prop models it loaded. If it still cannot find them, linking the "csgo" folder with the texture folder button works too.
0.9.11 - Counter-Strike maps: the game now finds Counter-Strike: Global Offensive ("csgo legacy" or "Counter-Strike Global Offensive" in any of your Steam libraries) by itself and uses its files for the props, models and textures of CS:GO maps. Model files inside the game's archives could not be read at all before; they can now, for every Source game. Terrain and ground far outside the map are no longer loaded or walkable: CS:GO maps are limited to the area around their lights, sounds, spawns and props.
0.9.10 - Counter-Strike maps import much better. The playable area is now found from the map's own geometry instead of a box around the spawn points, so the ends of maps like Inferno are no longer cut off, and the faraway 3D skybox is left out. Breakable and see-through map pieces and the props placed as entities (crates, barrels, carts) are now included. Maps that carry a small 2 vs 2 layout (Inferno does) can be imported as Wingman: tick "Small (Wingman) layout" on the Custom map screen or in the lobby, and the blocker walls, the 2v2 spawn points and the one reachable bomb site are used. Spawn points that the map keeps switched off are no longer used in the normal layout.
0.9.9 - High textures: far less grime, cracks and dirt (clean surfaces stay clean, dirt now collects in the grooves), and the 3D props are now textured too. Crates, barrels, tables, shelves, chests, pillars, cars and the rest get real wood grain, brushed metal, stone, painted and foliage surfaces over their normal colours, and round objects are smoother. Works in both the hardware and software renderers.
