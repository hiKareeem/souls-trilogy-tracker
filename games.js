"use strict";

/*
 * What each panel shows. `item` must match the Archipelago item name exactly;
 * dev/check-item-names.mjs verifies that against a live server's data package.
 *
 * - milestones: the items the ending needs (large chips)
 * - keys:       key items that open areas or shops (small chips). Based on the
 *               community PopTracker packs' key-item grids; DLC-only items are
 *               left out because they can never light when the DLC is off.
 * - counters:   items worth counting; `items` lists every name that counts.
 *
 * Any other progression item a slot receives can be listed under the chips
 * with the "Also list other progression items" option.
 */

const TRILOGY_GAMES = [
    {
        id: "ds1",
        game: "Dark Souls Remastered",
        title: "Dark Souls",
        milestones: [
            { item: "Lordvessel", label: "Lordvessel" },
            { item: "Lord Soul (Nito)", label: "Nito" },
            { item: "Lord Soul (Bed of Chaos)", label: "Bed of Chaos" },
            { item: "Bequeathed Lord Soul Shard (Four Kings)", label: "Four Kings" },
            { item: "Bequeathed Lord Soul Shard (Seath)", label: "Seath" },
        ],
        keys: [
            { item: "Undead Asylum F2 West Key", label: "Asylum F2 West Key" },
            { item: "Basement Key", label: "Basement Key" },
            { item: "Key to Depths", label: "Depths Key" },
            { item: "Watchtower Basement Key", label: "Watchtower Key" },
            { item: "Residence Key", label: "Residence Key" },
            { item: "Blighttown Key", label: "Blighttown Key" },
            { item: "Cage Key", label: "Cage Key" },
            { item: "Key to the Seal", label: "Key to the Seal" },
            { item: "Key to New Londo Ruins", label: "New Londo Key" },
            { item: "Crest Key", label: "Crest Key" },
            { item: "Annex Key", label: "Annex Key" },
            { item: "Peculiar Doll", label: "Peculiar Doll" },
            { item: "Orange Charred Ring", label: "Orange Charred Ring" },
            { item: "Covenant of Artorias", label: "Covenant of Artorias" },
            { item: "Skull Lantern", label: "Skull Lantern" },
            { item: "Sunlight Maggot", label: "Sunlight Maggot" },
            { item: "Archive Prison Extra Key", label: "Prison Extra Key" },
            { item: "Archive Tower Giant Cell Key", label: "Giant Cell Key" },
            { item: "Archive Tower Giant Door Key", label: "Giant Door Key" },
            { item: "Darkmoon Seance Ring", label: "Darkmoon Seance Ring" },
            { item: "Broken Pendant", label: "Broken Pendant" },
            { item: "Crest of Artorias", label: "Crest of Artorias" },
        ],
        counters: [
            {
                item: "Fire Keeper Soul",
                label: "Fire Keeper Souls",
                max: 7,
                items: [
                    "Fire Keeper Soul (Anastacia of Astora)",
                    "Fire Keeper Soul (Undead Parish)",
                    "Fire Keeper Soul (Blighttown)",
                    "Fire Keeper Soul (Daughter of Chaos)",
                    "Fire Keeper Soul (New Londo)",
                    "Fire Keeper Soul (Duke's Archives)",
                    "Fire Keeper Soul (Darkmoon Knightess)",
                ],
            },
        ],
        // DSAP publishes the player's current map to data storage for map trackers.
        // Index table: MapToIndex in DSAP's source/DSAP/Helpers/MapHelper.cs.
        areaKey: (team, slot) => `DSR_current_map_${team}_${slot}`,
        areas: {
            1: "Anor Londo", 2: "Anor Londo", 3: "Ash Lake", 4: "Blighttown", 5: "Blighttown",
            6: "Catacombs", 7: "Crystal Cave", 8: "Darkroot Basin", 9: "Darkroot Garden", 10: "Demon Ruins",
            11: "Depths", 12: "Duke's Archives", 13: "Duke's Archives", 14: "Firelink Shrine", 15: "Great Hollow",
            16: "Kiln of the First Flame", 17: "Lost Izalith", 18: "New Londo Ruins", 19: "Painted World",
            20: "Sen's Fortress", 21: "Sen's Fortress", 22: "Sen's Fortress", 23: "Tomb of the Giants",
            24: "Tomb of the Giants", 25: "Undead Asylum", 26: "Undead Burg", 27: "Undead Burg",
            28: "Undead Parish", 29: "Valley of Drakes", 30: "Sanctuary Garden", 31: "Royal Wood",
            32: "Oolacile Township", 33: "Chasm of the Abyss",
        },
    },
    {
        id: "ds2",
        game: "Dark Souls II",
        title: "Dark Souls II",
        milestones: [
            { item: "King's Ring", label: "King's Ring" },
            { item: "Ashen Mist Heart", label: "Ashen Mist Heart" },
            { item: "Giant's Kinship", label: "Giant's Kinship" },
        ],
        keys: [
            { item: "Rotunda Lockstone", label: "Rotunda Lockstone" },
            { item: "Soldier Key", label: "Soldier Key" },
            { item: "Key to King's Passage", label: "King's Passage Key" },
            { item: "Bastille Key", label: "Bastille Key" },
            { item: "Iron Key", label: "Iron Key" },
            { item: "Forgotten Key", label: "Forgotten Key" },
            { item: "Brightstone Key", label: "Brightstone Key" },
            { item: "Antiquated Key", label: "Antiquated Key" },
            { item: "Fang Key", label: "Fang Key" },
            { item: "House Key", label: "House Key" },
            { item: "Lenigrast's Key", label: "Lenigrast's Key" },
            { item: "Tseldora Den Key", label: "Tseldora Den Key" },
            { item: "Undead Lockaway Key", label: "Lockaway Key" },
            { item: "Aldia Key", label: "Aldia Key" },
            { item: "Master Lockstone", label: "Master Lockstone" },
            { item: "Dull Ember", label: "Dull Ember" },
            { item: "Ladder Miniature", label: "Ladder Miniature" },
            { item: "Ring of Whispers", label: "Ring of Whispers" },
            { item: "Silvercat Ring", label: "Silvercat Ring" },
            { item: "Flying Feline Boots", label: "Feline Boots" },
        ],
        counters: [
            { item: "Estus Flask Shard", label: "Estus Shards", max: 12 },
            { item: "Sublime Bone Dust", label: "Bone Dust", max: 5 },
            { item: "Soul of a Giant", label: "Giant Souls", max: 5 },
        ],
    },
    {
        id: "ds3",
        game: "Dark Souls III",
        title: "Dark Souls III",
        milestones: [
            { item: "Cinders of a Lord - Abyss Watcher", label: "Abyss Watchers" },
            { item: "Cinders of a Lord - Yhorm the Giant", label: "Yhorm" },
            { item: "Cinders of a Lord - Aldrich", label: "Aldrich" },
            { item: "Cinders of a Lord - Lothric Prince", label: "Lothric" },
        ],
        keys: [
            { item: "Coiled Sword", label: "Coiled Sword" },
            { item: "Small Lothric Banner", label: "Lothric Banner" },
            { item: "Basin of Vows", label: "Basin of Vows" },
            { item: "Small Doll", label: "Small Doll" },
            { item: "Path of the Dragon", label: "Path of the Dragon" },
            { item: "Storm Ruler", label: "Storm Ruler" },
            { item: "Transposing Kiln", label: "Transposing Kiln" },
            { item: "Tower Key", label: "Tower Key" },
            { item: "Cell Key", label: "Cell Key" },
            { item: "Grave Key", label: "Grave Key" },
            { item: "Lift Chamber Key", label: "Lift Chamber Key" },
            { item: "Jailbreaker's Key", label: "Jailbreaker's Key" },
            { item: "Jailer's Key Ring", label: "Jailer's Key Ring" },
            { item: "Old Cell Key", label: "Old Cell Key" },
            { item: "Grand Archives Key", label: "Archives Key" },
            { item: "Chameleon", label: "Chameleon" },
            { item: "Twinkling Dragon Torso Stone", label: "Dragon Torso Stone" },
        ],
        counters: [
            { item: "Estus Shard", label: "Estus Shards", max: 11 },
            { item: "Undead Bone Shard", label: "Bone Shards", max: 10 },
        ],
    },
];
