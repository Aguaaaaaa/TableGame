export const MANILA_BOARD_WIDTH = 1586;
export const MANILA_BOARD_HEIGHT = 992;
export const MANILA_ROUTE_MAX = 13;

const rect = (x, y, width, height) => Object.freeze({ x, y, width, height });
const point = (x, y) => Object.freeze({ x, y });

export const MANILA_BOARD_LAYOUT = Object.freeze({
  world: Object.freeze({ width: MANILA_BOARD_WIDTH, height: MANILA_BOARD_HEIGHT }),
  port: Object.freeze([
    Object.freeze({ id: "A", rect: rect(110, 125, 390, 90), rotation: 4 }),
    Object.freeze({ id: "B", rect: rect(85, 230, 410, 95), rotation: 5 }),
    Object.freeze({ id: "C", rect: rect(55, 345, 425, 100), rotation: 6 })
  ]),
  yard: Object.freeze([
    Object.freeze({ id: "A", rect: rect(1145, 90, 395, 115), rotation: -4 }),
    Object.freeze({ id: "B", rect: rect(1110, 220, 410, 105), rotation: -5 }),
    Object.freeze({ id: "C", rect: rect(1105, 335, 400, 115), rotation: -6 })
  ]),
  pirate: Object.freeze({ rect: rect(690, 18, 210, 112), slots: rect(725, 42, 142, 62) }),
  pilots: Object.freeze([
    Object.freeze({ id: "small", rect: rect(595, 155, 150, 108) }),
    Object.freeze({ id: "large", rect: rect(845, 155, 150, 108) })
  ]),
  insurance: Object.freeze({ rect: rect(1135, 470, 360, 145) }),
  market: Object.freeze({ rect: rect(1085, 660, 445, 245), columns: 4, rows: 5 }),
  routeField: Object.freeze({ rect: rect(465, 275, 570, 610) }),
  routes: Object.freeze([
    Object.freeze({ id: "left", start: point(555, 860), end: point(665, 285) }),
    Object.freeze({ id: "center", start: point(755, 860), end: point(785, 285) }),
    Object.freeze({ id: "right", start: point(935, 860), end: point(905, 285) })
  ])
});

export function routePoint(routeIndex, step) {
  const route = MANILA_BOARD_LAYOUT.routes[routeIndex];
  if (!route) throw new RangeError(`Unknown Manila route: ${routeIndex}`);
  const normalizedStep = Math.max(0, Math.min(MANILA_ROUTE_MAX, Number(step) || 0));
  const progress = normalizedStep / MANILA_ROUTE_MAX;
  return {
    x: route.start.x + (route.end.x - route.start.x) * progress,
    y: route.start.y + (route.end.y - route.start.y) * progress
  };
}

export function boardPercent(value, axis) {
  const size = axis === "y" ? MANILA_BOARD_HEIGHT : MANILA_BOARD_WIDTH;
  return `${(Number(value) / size * 100).toFixed(4)}%`;
}

