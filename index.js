import { load_rules } from "./rules1_state.js";
import { mkDialog, runResponse } from "./dialog.js";
import { rnd, rnd_one_in } from "./math.js";

const ctx = document.getElementById("board").getContext("2d");

const colors = [
    "LightPink",
    "AliceBlue",
    "MediumOrchid",
    "SeaGreen",
    "BurlyWood",
    "Violet",
    "Tomato",
    "Chocolate",
].sort((a, b) => 0.5 - Math.random());

const filterOut = (arr, f) => {
    for (let i = 0; i < arr.length; i++) {
        const el = arr[i];
        if (!f(el, i, arr)) {
            arr.splice(i--, 1);
        }
    }
    return arr;
};

let uid = 0;
const main = async () => {
    const context = await load_rules();
    console.log(context);

    const world = {
        time: 0,
        lastTime: 0,
        lastIdleCheck: 0,
        isIdle: 1,
        ents: [],
        utters: {},
        click: false,
        currentQuery: null,
        voxs: context.voxs,
    };

    // TODO: world should be in context? (maybe pass into rules1.worldLookup)
    world.runQuery = mkDialog(world, context);
    world.runAndRespond = (query) => {
        const match = world.runQuery(query);
        if (match) {
            return runResponse(match, context.responses);
        }
        return null;
    };
    world.setQuery = (query) =>
        (world.currentQuery = {
            query,
        });

    // Add the characters
    [...Array(3)]
        .fill(0)
        .map(() => mk_e(++uid))
        .forEach((e, i) => {
            e.x = (i + 2) * 100 + 0;
            e.y = ctx.canvas.height / 2;
            world.ents.push(e);
        });

    world.setQuery({ what: "onBorn" });

    ctx.canvas.addEventListener("click", () => (world.click = true), false);

    requestAnimationFrame((time) => {
        world.lastTime = time;
        run(0, world, ctx);
    });
};
main();

function run(dt, world, ctx) {
    update(world, dt);
    render(world, ctx);
    world.click = false;
    requestAnimationFrame((time) => {
        const dt = time - world.lastTime;
        world.lastTime = time;
        world.time += dt;
        run(dt, world, ctx);
    });
}

function update(world, dt) {
    world.lastIdleCheck += dt;
    if (world.isIdle === 1 && world.lastIdleCheck > 2300) {
        world.setQuery({ what: "onIdle" });
    }

    const three = world.ents[2];
    three.x += 0.5 * three.dir;
    if (three.x > 800 || three.x < 400) {
        three.dir *= -1;
    }

    if (
        world.isIdle &&
        (world.click || rnd_one_in(1000)) &&
        world.ents.length < 4
    ) {
        const m = mk_e(++uid);
        m.x = 50;
        m.y = 100;
        m.life = 2000;
        world.ents.push(m);
        world.isIdle = 0;
        world.setQuery({ what: "onAppear" });
    }

    filterOut(world.ents, (e) => {
        if (e.life > 0) {
            e.life -= dt;
            if (e.life <= 0) {
                // Hmmm... setQuery splats over the current query....
                // so had to runQuery... but no good, what if multiple.
                /*
                  idea: setQuery sets the "nextQueyr" not the currentquery.
                  if the next query doesn't return a response, then ignore
                  it (it executes for its side effects), otherwise make
                  it the currentQuery.

                  NOt sure this is correct though. If an event is happening
                  then another even happens that noone says anything about,
                  should the previous conversation just continue? What
                  if the event is important, just not something you can
                  say something about?
                  */

                world.runQuery({ what: "onDisappear" });
                return false;
            }
        }
        return true;
    });

    processPendingQuery(world);
}

function processPendingQuery(world) {
    const { currentQuery: q, time } = world;
    if (q && (q.time === undefined || time > q.time + 2000)) {
        const initQuery = q.query || {
            from: q.who,
            what: q.what,
            [q.response]: true,
        };
        const res = world.runAndRespond(initQuery);
        if (res) {
            world.utters[res.who] = {
                vox: world.voxs[res.element],
                time,
            };
            world.currentQuery = {
                ...res,
                time,
            };
            if (res.target) {
                console.log(res.target, res.next);
            }
        } else {
            world.currentQuery = null;
            world.isIdle = 1;
        }
        world.lastIdleCheck = 0;
    }
}

function render(world, ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#fff";

    ctx.font = "14pt sans-serif";

    world.ents.forEach((e) => draw_ch(ctx, e));
    Object.entries(world.utters).forEach(([k, v]) => {
        const who = +k.slice(2);

        ctx.fillStyle = colors[parseInt(who) % colors.length];
        ctx.fillText(v.vox, (who + 1) * 100 - 20, 70 + (who % 2) * 20);
        // Deleting in "render"... bit bad but eh.
        if (world.time - v.time > 2000) {
            delete world.utters[k];
        }
    });
}

const draw_ch = (ctx, e) => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(0.333, 0.333);
    ctx.fillStyle = colors[e.id % colors.length];
    ctx.fillRect(0, 0, 20, 40);
    ctx.restore();
};

const mk_e = (uid) => {
    const id = uid ?? rnd(9999);
    return {
        x: 0,
        y: 0,
        dir: 1,
        id,
        tag: "e_" + id,
        stats: {
            health: 50,
            hunger: 0,
            thirst: 0,
        },
    };
};
