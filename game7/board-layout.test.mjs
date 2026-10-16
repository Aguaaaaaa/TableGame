import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  MANILA_BOARD_HEIGHT,
  MANILA_BOARD_LAYOUT,
  MANILA_BOARD_WIDTH,
  MANILA_ROUTE_MAX,
  boardPercent,
  routePoint
} from "./board-layout.mjs";

const root=path.dirname(fileURLToPath(import.meta.url));

test("generated Manila board matches the fixed coordinate world",()=>{
  const png=fs.readFileSync(path.join(root,"assets","manila-harbor-board-v1.png"));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),MANILA_BOARD_WIDTH);
  assert.equal(png.readUInt32BE(20),MANILA_BOARD_HEIGHT);
});

test("all Manila overlay rectangles stay inside the generated board", () => {
  const rectangles = [
    ...MANILA_BOARD_LAYOUT.port.map((zone) => zone.rect),
    ...MANILA_BOARD_LAYOUT.yard.map((zone) => zone.rect),
    MANILA_BOARD_LAYOUT.pirate.rect,
    MANILA_BOARD_LAYOUT.pirate.slots,
    ...MANILA_BOARD_LAYOUT.pilots.map((zone) => zone.rect),
    MANILA_BOARD_LAYOUT.insurance.rect,
    MANILA_BOARD_LAYOUT.market.rect,
    MANILA_BOARD_LAYOUT.routeField.rect
  ];
  rectangles.forEach((zone) => {
    assert.ok(zone.x >= 0 && zone.y >= 0);
    assert.ok(zone.width > 0 && zone.height > 0);
    assert.ok(zone.x + zone.width <= MANILA_BOARD_WIDTH);
    assert.ok(zone.y + zone.height <= MANILA_BOARD_HEIGHT);
  });
});

test("the three routes expose stable level 0 and level 13 anchors", () => {
  MANILA_BOARD_LAYOUT.routes.forEach((route, index) => {
    assert.deepEqual(routePoint(index, 0), route.start);
    assert.deepEqual(routePoint(index, MANILA_ROUTE_MAX), route.end);
    const middle = routePoint(index, 6.5);
    assert.equal(middle.x, (route.start.x + route.end.x) / 2);
    assert.equal(middle.y, (route.start.y + route.end.y) / 2);
  });
});

test("layout coordinates can be converted into stable percentages", () => {
  assert.equal(boardPercent(MANILA_BOARD_WIDTH, "x"), "100.0000%");
  assert.equal(boardPercent(MANILA_BOARD_HEIGHT, "y"), "100.0000%");
  assert.equal(boardPercent(MANILA_BOARD_WIDTH / 2, "x"), "50.0000%");
});

