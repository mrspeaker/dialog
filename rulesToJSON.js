export function transformRules(rules) {
    return rules
        .split(/\n\s*\n/)
        .filter((l) => !!l.trim())
        .filter((l) => !l.trim().startsWith(";"))
        .map(transformRule);
}

function transformRule(input) {
    const parseOps = (str) => {
        const toks = str.split(" ");
        if (toks.length === 1) return [toks[0]]; // symbol
        if (toks.length === 2) return [toks[0], toks[1]]; // symbol, value
        return toks; // symbol, op, value
    };

    const regex = /^when\s+(\w+)\s+(\w+)\s+\((\w+)\)\s*\n([\s\S]*)/m;
    const match = input.match(regex);
    if (!match) {
        console.log("parse rule error", input);
        return null;
    }
    const [, who, what, name, rest] = match;
    const out = { name };
    // parse the rest...
    const lines = rest.split("\n").map((l) => l.trim());
    let cur = 0;
    // criteria
    out.criteria = [
        ["who", who],
        ["what", what],
        ...lines[cur]
            .slice(3)
            .split("&")
            .map((l) => l.trim())
            .map(parseOps),
    ];

    // response
    if (lines[++cur].startsWith("then ")) {
        out.response = lines[1].slice("then ".length);
        cur++;
    }

    // storage
    if (lines[cur]?.startsWith("store ")) {
        out.store = lines[cur]
            .slice("store ".length)
            .split("&")
            .map((l) => l.trim())
            .map(parseOps);
    }
    return out;
}
