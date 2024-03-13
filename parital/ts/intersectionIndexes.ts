type WindowOneEdgeIndex = number;
type WindowTwoEdgeIndex = number;

type PossibleIntersection = [WindowOneEdgeIndex, WindowTwoEdgeIndex];

// index constants
const TOP = 0;
const RIGHT = 1;
const BOTTOM = 2;
const LEFT = 3;

export const INTERSECTION_INDEXES: PossibleIntersection[] = [
  [TOP, RIGHT],
  [TOP, LEFT],
  [RIGHT, BOTTOM],
  [RIGHT, TOP],
  [BOTTOM, LEFT],
  [BOTTOM, RIGHT],
  [LEFT, TOP],
  [LEFT, BOTTOM],
];
