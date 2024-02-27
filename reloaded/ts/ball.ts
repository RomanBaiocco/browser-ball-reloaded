import ballImage from "../ball.png";

import { Edge, Point, Vector } from "./geometry";
import { World } from "./world";

const RENDER_RATE_IN_MS = 15;

const GRAVITY = 1;
const BOUNCE_DECAY = 0.89;
const ORTHOGINAL_VELOCITY_DECAY = 0.97;
const ROTATION_FACTOR = 0.015;

enum BallEdge {
  Top = "Top",
  Right = "Right",
  Bottom = "Bottom",
  Left = "Left",
}

interface BallOptions {
  scale?: number;
}

export class Ball {
  // Configurable properties
  scale = 1;

  // State
  dragging = true;
  img = new Image();
  angle = 0;
  rotation = 0;
  width = 90;
  height = 90;
  radius = 0;
  center;
  offset = {
    x: 0,
    y: 0,
  };
  initialDragPoint = new Point(0, 0);
  velocity = new Vector(0, 0);

  world: World;

  constructor(world: World, options: BallOptions = {}) {
    this.world = world;

    if (options.scale) {
      this.scale = options.scale;
    }

    this.width *= this.scale;
    this.height *= this.scale;
    this.radius = this.width / 2;
    this.offset = { x: this.width / 2, y: this.height / 2 };
    this.center = new Point(window.innerWidth / 2, window.innerHeight / 2);
    this.img.onload = () => {
      setInterval(this.renderBall, RENDER_RATE_IN_MS);
    };
    this.img.src = ballImage;
  }

  inside = (p: Point) => {
    const distanceFromCenter = Math.sqrt((this.center.x - p.x) ** 2 + (this.center.y - p.y) ** 2);
    return this.offset.x >= distanceFromCenter;
  };

  edges = () => {
    // The corners of the ball
    const topLeft = new Point(this.center.x - this.offset.x, this.center.y - this.offset.y);
    const topRight = new Point(this.center.x + this.offset.x, this.center.y - this.offset.y);
    const bottomRight = new Point(this.center.x + this.offset.x, this.center.y + this.offset.y);
    const bottomLeft = new Point(this.center.x - this.offset.x, this.center.y + this.offset.y);

    return {
      [BallEdge.Top]: new Edge(topLeft, topRight),
      [BallEdge.Right]: new Edge(topRight, bottomRight),
      [BallEdge.Bottom]: new Edge(bottomLeft, bottomRight),
      [BallEdge.Left]: new Edge(topLeft, bottomLeft),
    };
  };

  renderBall = () => {
    if (!this.dragging) {
      this.velocity.y += GRAVITY;
      if (Math.abs(this.velocity.x) < 1) this.velocity.x = 0;
      if (Math.abs(this.velocity.y) < 1) this.velocity.y = 0;
      this.center = new Point(this.center.x + Math.round(this.velocity.x), this.center.y + Math.round(this.velocity.y));
      this.handleCollision();
    }

    this.world.quads.forEach((quad) => {
      const windowRef = quad.windowRef;
      const windowContext = quad.context;
      if (!windowContext) throw new Error("renderBall: CanvasRenderingContext2D not found");

      const xTranslation = this.center.x - (windowRef.screenX - this.world.referencePoint.x);
      const yTranslation = this.center.y - (windowRef.screenY - this.world.referencePoint.y);

      windowContext.save();
      windowContext.clearRect(0, 0, windowRef.innerWidth, windowRef.innerHeight);
      windowContext.translate(xTranslation, yTranslation);
      this.angle += this.rotation;
      windowContext.rotate(this.angle);
      windowContext.drawImage(this.img, -this.offset.x, -this.offset.y, this.width, this.height);
      windowContext.restore();
    });
  };

  handleCollision = () => {
    const ballEdges = this.edges();

    // How much of each ball edge is outside the world
    const ballEdgeOutsideWorld = [
      this.width - this.lengthOfEdgeInsideWorld(ballEdges[BallEdge.Top]),
      this.height - this.lengthOfEdgeInsideWorld(ballEdges[BallEdge.Right]),
      this.width - this.lengthOfEdgeInsideWorld(ballEdges[BallEdge.Bottom]),
      this.height - this.lengthOfEdgeInsideWorld(ballEdges[BallEdge.Left]),
    ];

    if (ballEdgeOutsideWorld.some((edge) => !!edge)) {
      let amountOfEdgeOutOfWindow = 0;
      let edgesAtLeastPartiallyInsideWindow = 0;

      let isSideCollision = false;

      for (let edgeIndex = 0; edgeIndex < 4; edgeIndex++) {
        // If the entiry of the edge is outside the world
        if (ballEdgeOutsideWorld[edgeIndex] == this.width) {
          let edge1 = ballEdgeOutsideWorld[(edgeIndex + 3) % 4];
          edge1 = edge1 == this.width ? 0 : edge1;
          let edge2 = ballEdgeOutsideWorld[(edgeIndex + 1) % 4];
          edge2 = edge2 == this.width ? 0 : edge2;
          const edgeOutOfWindow = edge1 > edge2 ? edge1 : edge2;
          if (edgeOutOfWindow > amountOfEdgeOutOfWindow) {
            amountOfEdgeOutOfWindow = edgeOutOfWindow;
            isSideCollision = edgeIndex % 2 == 1;
          }
        } else {
          edgesAtLeastPartiallyInsideWindow++;
        }
      }

      // console.log({ amountOfEdgeOutOfWindow, I: edgesAtLeastPartiallyInsideWindow });

      if (amountOfEdgeOutOfWindow && isSideCollision) {
        // Handle hitting a side wall
        this.handleOrthoganalCollision("x", amountOfEdgeOutOfWindow);
      } else if (amountOfEdgeOutOfWindow && !isSideCollision) {
        // Handle hitting a top or bottom wall
        this.handleOrthoganalCollision("y", amountOfEdgeOutOfWindow);
      } else if (edgesAtLeastPartiallyInsideWindow !== 3) {
        // Handle hitting a corner
        const { closestCornerIndex, distanceToClosestCorner } = this.world.corners.reduce(
          (acc, corner, cornerIndex) => {
            const distanceVector = new Vector(this.center.x - corner.x, this.center.y - corner.y);
            const distanceToCorner = Math.sqrt(distanceVector.x ** 2 + distanceVector.y ** 2);
            if (distanceToCorner < acc.distanceToClosestCorner) {
              return { closestCornerIndex: cornerIndex, distanceToClosestCorner: distanceToCorner };
            }
            return acc;
          },
          { closestCornerIndex: -1, distanceToClosestCorner: Infinity }
        );

        if (closestCornerIndex >= 0) {
          const closestCorner = this.world.corners[closestCornerIndex];

          const isBallInsideOfCornerX =
            closestCorner.dx > 0 ? this.center.x > closestCorner.x : this.center.x < closestCorner.x;
          const isBallInsideOfCornerY =
            closestCorner.dy > 0 ? this.center.y > closestCorner.y : this.center.y < closestCorner.y;

          if ((isBallInsideOfCornerX || isBallInsideOfCornerY) && !(isBallInsideOfCornerX && isBallInsideOfCornerY)) {
            if (isBallInsideOfCornerX) {
              // Handle like it hit a top or bottom wall
              const verticalDistanceFromCorner = this.radius - Math.abs(this.center.y - closestCorner.y);
              this.handleOrthoganalCollision("y", verticalDistanceFromCorner);
            } else {
              // Handle like it hit a left or right wall
              const horizontalDistanceFromCorner = this.radius - Math.abs(this.center.x - closestCorner.x);
              this.handleOrthoganalCollision("x", horizontalDistanceFromCorner);
            }
          } else if (distanceToClosestCorner < this.radius) {
            // Hit corner in a way that the ceneter of the ball is entirely inside or outside the corner
            const currentBallVeloictyX = this.velocity.x;
            const currentBallVeloictyY = this.velocity.y;

            const velocityAdjustmentFactor =
              (this.radius - distanceToClosestCorner) /
              Math.sqrt(currentBallVeloictyX ** 2 + currentBallVeloictyY ** 2);

            this.center.x -= Math.round(currentBallVeloictyX * velocityAdjustmentFactor);
            this.center.y -= Math.round(
              currentBallVeloictyY * velocityAdjustmentFactor * (currentBallVeloictyY < 0 ? -1 : 1)
            );

            const isBallMovingAwayFromCornerX =
              (closestCorner.dx < 0 && currentBallVeloictyX > 0) || (closestCorner.dx > 0 && currentBallVeloictyX < 0);

            const isBallMovingAwayFromCornerY =
              (closestCorner.dy < 0 && currentBallVeloictyY > 0) || (closestCorner.dy > 0 && currentBallVeloictyY < 0);

            this.velocity.x =
              !isBallMovingAwayFromCornerX && !isBallMovingAwayFromCornerY
                ? currentBallVeloictyY * BOUNCE_DECAY * -closestCorner.dx
                : currentBallVeloictyX * (isBallMovingAwayFromCornerX ? 1 : -1);
            this.velocity.y =
              !isBallMovingAwayFromCornerX && !isBallMovingAwayFromCornerY
                ? currentBallVeloictyX * BOUNCE_DECAY * -closestCorner.dy
                : currentBallVeloictyY * BOUNCE_DECAY * (isBallMovingAwayFromCornerY ? 1 : -1);

            this.rotation = this.velocity.x * ROTATION_FACTOR + this.velocity.y * ROTATION_FACTOR;
          }
        }
      }
    }
  };

  lengthOfEdgeInsideWorld = (edge: Edge): number => {
    for (const quad of this.world.quads) {
      const isPoint1InsideQuad = quad.pointInside(edge.point1);
      const isPoint2InsideQuad = quad.pointInside(edge.point2);

      if (isPoint1InsideQuad && isPoint2InsideQuad) {
        return edge.isVertical() ? edge.point2.y - edge.point1.y : edge.point2.x - edge.point1.x;
      } else {
        if (isPoint1InsideQuad && !isPoint2InsideQuad) {
          if (edge.isVertical()) {
            const newEdge = new Edge(new Point(edge.point1.x, quad.bottomRightCorner.y + 1), edge.point2);
            return quad.bottomRightCorner.y - edge.point1.y + 1 + this.lengthOfEdgeInsideWorld(newEdge);
          } else {
            const newEdge = new Edge(new Point(quad.bottomRightCorner.x + 1, edge.point1.y), edge.point2);
            return quad.bottomRightCorner.x - edge.point1.x + 1 + this.lengthOfEdgeInsideWorld(newEdge);
          }
        } else {
          if (!isPoint1InsideQuad && isPoint2InsideQuad) {
            if (edge.isVertical()) {
              const newEdge = new Edge(edge.point1, new Point(edge.point2.x, quad.topLeftCorner.y - 1));
              return edge.point2.y - quad.topLeftCorner.y + 1 + this.lengthOfEdgeInsideWorld(newEdge);
            } else {
              const newEdge = new Edge(edge.point1, new Point(quad.topLeftCorner.x - 1, edge.point2.y));
              return edge.point2.x - quad.topLeftCorner.x + 1 + this.lengthOfEdgeInsideWorld(newEdge);
            }
          }
        }
      }
    }

    return 0;
  };

  /**
   * @param { "x" | "y" } direction - The direction of the collision
   **/
  handleOrthoganalCollision = (direction: "x" | "y", adjustment: number) => {
    const collisionAxis = direction;
    const orthoganalAxis = direction === "x" ? "y" : "x";

    this.center[collisionAxis] -= adjustment * (this.velocity[collisionAxis] < 0 ? -1 : 1);
    // Don't make this adjustment if the ball is moving vertically and is moving slowly
    if (collisionAxis === "x" || this.velocity.y > 1) {
      this.center[orthoganalAxis] -=
        Math.round((adjustment * this.velocity[orthoganalAxis]) / this.velocity[collisionAxis]) *
        (this.velocity[orthoganalAxis] < 0 ? -1 : 1);
    }

    this.velocity[collisionAxis] = -this.velocity[collisionAxis] * BOUNCE_DECAY;
    this.velocity[orthoganalAxis] = this.velocity[orthoganalAxis] * ORTHOGINAL_VELOCITY_DECAY;
    this.rotation = this.velocity[orthoganalAxis] * ROTATION_FACTOR;
  };
}
