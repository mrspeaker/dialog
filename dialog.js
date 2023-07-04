import { rnd_el } from "../math.js";

const dbg = false;

export const mkDialog = (world, context) => (querySpace) =>
    runQuery(world, context, querySpace);

const mkExprValue = (v) => {
    if (v === "now") return Date.now();
    return +v;
};

// TODO: maybe world should be in context, not separate param?
function runQuery(world, context, queryInit) {
    const { rules, memory, worldLookup, entLookup } = context;
    const queryWorld = worldLookup(world);

    // Iterate over every entity and see if any match any rule
    const matchingRules = world.ents.reduce((ac, e) => {
        // TODO: Verrry inefficient! use prototypes
        const querySpace = { ...queryInit, ...entLookup(e), ...queryWorld };
        const matchy = matchRules(
            querySpace,
            queryInit /*initial space just for debg*/,
            rules,
            memory
        );
        return [...ac, ...matchy];
    }, []);

    dbg && console.log("\nMATCHES:", matchingRules.length);
    if (!matchingRules.length) {
        return null;
    }
    const chosen = rnd_el(matchingRules);
    // Store any "on trigger" memory items
    if (chosen.response.store) {
        applyExprToStateAndQS(chosen.response.store, chosen.querySpace, memory);
    }
    return chosen;
}

/*
  Returns a list of matched rules, with their associated querySpace
*/
function matchRules(querySpace, queryDbg, rules, memory) {
    const { who } = querySpace;
    dbg && console.log("\n\nQUERY", who, queryDbg, querySpace);
    const matches = rules
        .filter((r) => {
            const matched = matchCriteria(r, querySpace, memory);
            // Update env for any "just store value" responses
            if (matched && r.store?.length && !r.response) {
                // Don't include rules in matches, if they don't do anything
                // (that is, they are just for storing values)
                applyExprToStateAndQS(r.store, querySpace, memory);
                return false;
            }
            return matched;
        })
        .map((response) => ({
            querySpace,
            response,
        }));
    dbg && console.log("MATCHED", who, matches.length);
    return matches;
}

function matchCriteria(rule, querySpace, memory) {
    const { who } = querySpace;
    return rule.criteria.every((c) => {
        const [key] = c;
        const isOp = c.length === 3;
        const hasKey = key in querySpace;
        if (!hasKey) {
            if (!isOp) return false;
            // Undefined state variable. Define it.
            if (!memory.characters[who]) {
                memory.characters[who] = {};
            }
            memory.characters[who][key] = 0;
            querySpace[key] = 0;
        }
        const val = querySpace[key];
        let pass = false;
        // Symbol match
        if (c.length === 1) pass = true;
        // Equality match
        else if (c.length === 2) pass = val === c[1];
        // Comparison
        else {
            const op = c[1];
            const comp = mkExprValue(c[2]);
            switch (op) {
                case "=":
                    pass = val === comp;
                    break;
                case ">":
                    pass = val > comp;
                    break;
                case "<":
                    pass = val < comp;
                    break;
                default:
                    console.warn("no comparitor", c);
                    break;
            }
            dbg && console.log(c[0], pass, val, op, comp);
        }
        dbg && console.log(pass ? "Y" : "N", c[0], val, c[1]);
        return pass;
    });
}

function applyExprToStateAndQS(store, querySpace, memory) {
    const { who } = querySpace;
    store.forEach((s) => {
        const [keyRaw, op, valRaw] = s;
        const isWorld = keyRaw.startsWith("world.");
        const key = isWorld ? keyRaw.slice("world.".length) : keyRaw;
        // Init memory if undefined. Oof, can it be consolidated
        // with the init from `matchCriteria`?
        if (!isWorld && !memory.characters[who]) {
            memory.characters[who] = {};
            memory.characters[who][key] = 0;
            querySpace[key] = 0;
        }
        const obj = isWorld ? memory.world : memory.characters[who];
        if (!(key in obj)) {
            console.warn("No key in space:", who, key, obj);
            return;
        }
        const val = mkExprValue(valRaw);
        switch (op) {
            case "+":
                obj[key] += val;
                break;
            case "-":
                obj[key] -= val;
                break;
            case "=":
                obj[key] = val;
                break;
            default:
                console.warn("Operation not supported:", s);
                break;
        }
        // Update current query space too
        querySpace[key] = obj[key];
    });
}

export function runResponse(rule, responses) {
    const { response, querySpace } = rule;
    const { who } = querySpace;

    const res = responses[response.response];
    if (!res) {
        console.error("Response not found!", response);
        return null;
    }

    const [what, element, target, next] = rnd_el(res); // Pick one of the elements
    return {
        who,
        what,
        response: response.response,
        element,
        target,
        next,
    };
}
