import { responses, voxs } from "./rules1_responses.js";
import { transformRules } from "./rulesToJSON.js";

const rules_file = "./rules1.txt";

//-----------------------------
// State and logic: how to make this data-driven? Or at least, client-driven
// (where this logic is responsibility of caller)

const memory = {
    world: {
        lastTalk: Date.now() - 3000,
        isIdle: 1,
    },
    characters: {},
};

// Convert game world state into a lookup table
const worldLookup = (world) => ({
    // calc world stuff
    num_ents: world.ents.filter((e) => e.x < 550).length,
    // and world dialog state
    lastTalk: Date.now() - memory.world.lastTalk,
    ...(world.isIdle ? { isIdle: world.isIdle } : {}),
});

// Convert game character state into a lookup table
const entLookup = (ent) => ({
    who: ent.tag,
    ...ent.stats,
    ...(memory.characters[ent.tag] ?? {}),
});

export async function load_rules() {
    const rules = await load_text(rules_file);
    return {
        rules: transformRules(rules),
        memory,
        worldLookup,
        entLookup,
        responses,
        voxs,
    };
}

const load_text = async (path) => fetch(path).then((r) => r.text());
