export const rndf = () => Math.random();
export const rnd = (min, max = 0) =>
    Math.floor(max ? rndf() * (max + 1 - min) + min : rndf() * min);
export const rnd_el = (arr) => arr[rnd(arr.length)];
export const rnd_one_in = (chance) => Math.floor(rndf() * chance) === 0;
