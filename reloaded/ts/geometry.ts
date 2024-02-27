import { World } from "./world";

export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(point: Point) {
    return new Point(this.x + point.x, this.y + point.y);
  }
}

export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(vector: Vector) {
    return new Vector(this.x + vector.x, this.y + vector.y);
  }
}

export class Edge {
  point1: Point;
  point2: Point;

  constructor(point1: Point, point2: Point) {
    this.point1 = point1;
    this.point2 = point2;
  }

  /**
   * Create an edge from a point and a vector
   * @param point the first point of the edge
   * @param vector the vector to add to the point to get the second point of the edge
   * @returns a new edge
   */
  static fromPointAndVector(point: Point, vector: Vector) {
    return new Edge(point, point.add(vector));
  }

  /**
   * Check if the edge is vertical
   * @returns true if the edge is vertical, false otherwise
   */
  isVertical = () => this.point1.x === this.point2.x;

  /**
   * Create a copy of the edge with the points normalized
   * The normalized edge has the smallest x and y values as point1 and the largest x and y values as point2
   * @returns a new edge with normalized points
   */
  normalizedCopy = () => {
    return new Edge(
      new Point(Math.min(this.point1.x, this.point2.x), Math.min(this.point1.y, this.point2.y)),
      new Point(Math.max(this.point1.x, this.point2.x), Math.max(this.point1.y, this.point2.y))
    );
  };

  /**
   * Check if the edge intersects with another edge.
   * If they intersect, return the point of intersection,
   * otherwise return null
   * @param otherEdge the other edge to check for intersection
   * @returns the point of intersection or null
   */
  getIntersection(otherEdge: Edge): Point | null {
    // Create local copies
    const edge1 = this.normalizedCopy();
    const edge2 = otherEdge.normalizedCopy();

    if (edge1.isVertical()) {
      if (
        edge1.point1.x >= edge2.point1.x &&
        edge1.point1.x <= edge2.point2.x &&
        edge2.point1.y >= edge1.point1.y &&
        edge2.point2.y <= edge1.point2.y
      ) {
        return new Point(edge1.point1.x, edge2.point1.y);
      }
    } else {
      if (
        edge2.point1.x >= edge1.point1.x &&
        edge2.point1.x <= edge1.point2.x &&
        edge1.point1.y >= edge2.point1.y &&
        edge1.point2.y <= edge2.point2.y
      ) {
        return new Point(edge2.point1.x, edge1.point1.y);
      }
    }

    return null;
  }
}

export class Corner {
  x: number;
  y: number;
  dx: number;
  dy: number;

  constructor(x: number, y: number, dx: number, dy: number) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
  }
}

export type BrowserBallWindow = Window &
  typeof globalThis & {
    quadRef: number; // index in quads.list
  };

interface QuadProps {
  windowRef: BrowserBallWindow;
  worldReference: World["referencePoint"];
}

export class Quad {
  windowRef: BrowserBallWindow;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  topLeftCorner: Point;
  bottomRightCorner: Point;

  constructor({ windowRef, worldReference }: QuadProps) {
    const canvas = windowRef.document.getElementById("stage") as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context not found");

    const topLeftCorner = new Point(windowRef.screenX - worldReference.x, windowRef.screenY - worldReference.y);
    const bottomRightCorner = new Point(
      windowRef.screenX + windowRef.innerWidth - worldReference.x,
      windowRef.screenY + windowRef.innerHeight - worldReference.y
    );

    this.windowRef = windowRef;
    this.canvas = canvas;
    this.context = context;
    this.topLeftCorner = topLeftCorner;
    this.bottomRightCorner = bottomRightCorner;
  }

  /**
   * Get the edges of the quad
   * @returns an array of edges in the order: top, right, bottom, left
   **/
  edges = (): [Edge, Edge, Edge, Edge] => {
    const topRightCorner = new Point(this.bottomRightCorner.x, this.topLeftCorner.y);
    const bottomLeftCorner = new Point(this.topLeftCorner.x, this.bottomRightCorner.y);

    return [
      new Edge(this.topLeftCorner, topRightCorner),
      new Edge(topRightCorner, this.bottomRightCorner),
      new Edge(this.bottomRightCorner, bottomLeftCorner),
      new Edge(bottomLeftCorner, this.topLeftCorner),
    ];

    // return {
    //   top: new Edge(this.topLeftCorner, topRightCorner),
    //   right: new Edge(topRightCorner, this.bottomRightCorner),
    //   bottom: new Edge(this.bottomRightCorner, bottomLeftCorner),
    //   left: new Edge(bottomLeftCorner, this.topLeftCorner),
    // };
  };

  /**
   * Update the position of the quad relative to a new top-left corner of the world
   * @param newWorldReference
   */
  updatePosition = (newWorldReference: World["referencePoint"]) => {
    this.topLeftCorner = new Point(
      this.windowRef.screenX - newWorldReference.x,
      this.windowRef.screenY - newWorldReference.y
    );
    this.bottomRightCorner = new Point(
      this.windowRef.screenX + this.windowRef.innerWidth - newWorldReference.x,
      this.windowRef.screenY + this.windowRef.innerHeight - newWorldReference.y
    );
  };

  /**
   * Check if a point is inside the quad
   * @param point the point to check
   * @returns true if the point is inside the quad, false otherwise
   **/
  pointInside = (point: Point) => {
    return (
      point.x >= this.topLeftCorner.x &&
      point.x <= this.bottomRightCorner.x &&
      point.y >= this.topLeftCorner.y &&
      point.y <= this.bottomRightCorner.y
    );
  };

  /**
   * Check if a point is inside the quad but not on the edge
   * @param point the point to check
   * @returns true if the point is inside the quad but not on the edge, false otherwise
   **/
  pointInsideNotEdge = (point: Point) => {
    return (
      point.x > this.topLeftCorner.x &&
      point.x < this.bottomRightCorner.x &&
      point.y > this.topLeftCorner.y &&
      point.y < this.bottomRightCorner.y
    );
  };
}
