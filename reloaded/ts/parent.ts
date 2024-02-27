import { World } from "./world";

const world = new World();

// @ts-expect-error
window.browserBallWorld = world;
