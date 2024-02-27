import { Edge, Point, Vector } from "./geometry";
import type { World } from "./world";
import { DEFAULT_BALL_TYPE, type BallType } from "./ballTypes";

const RENDER_RATE_IN_MS = 15;

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
  gravity = DEFAULT_BALL_TYPE.gravity;
  bounceDecay = DEFAULT_BALL_TYPE.bounceDecay;
  orthoginalFriction = DEFAULT_BALL_TYPE.orthoginalFriction;
  rotationFactor = DEFAULT_BALL_TYPE.rotationFactor;
  scale = DEFAULT_BALL_TYPE.scale;
  img = new Image();

  // State
  dragging = true;
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

    this.width = Math.round(this.width * this.scale);
    this.height = Math.round(this.height * this.scale);
    this.radius = this.width / 2;
    this.offset = { x: this.width / 2, y: this.height / 2 };
    this.center = new Point(window.innerWidth / 2, window.innerHeight / 2);
    this.img.src = DEFAULT_BALL_TYPE.imgSrc;

    setInterval(this.renderBall, RENDER_RATE_IN_MS);
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
      this.velocity.y += this.gravity;
      if (Math.abs(this.velocity.x) < this.gravity) this.velocity.x = 0;
      if (Math.abs(this.velocity.y) < this.gravity) this.velocity.y = 0;
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

      if (amountOfEdgeOutOfWindow && isSideCollision) {
        this.handleOrthoganalCollision("x", amountOfEdgeOutOfWindow);
      } else if (amountOfEdgeOutOfWindow && !isSideCollision) {
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
              const verticalDistanceFromCorner = this.radius - Math.abs(this.center.y - closestCorner.y);
              this.handleOrthoganalCollision("y", verticalDistanceFromCorner);
            } else {
              const horizontalDistanceFromCorner = this.radius - Math.abs(this.center.x - closestCorner.x);
              this.handleOrthoganalCollision("x", horizontalDistanceFromCorner);
            }
          } else if (distanceToClosestCorner < this.radius) {
            // Hit corner in a way that the ceneter of the ball is entirely inside or outside the corner
            const currentBallVeloicty = this.velocity;

            const velocityAdjustmentFactor =
              (this.radius - distanceToClosestCorner) /
              Math.sqrt(currentBallVeloicty.x ** 2 + currentBallVeloicty.y ** 2);

            this.center.x -= Math.round(currentBallVeloicty.x * velocityAdjustmentFactor);
            this.center.y -= Math.round(
              currentBallVeloicty.y * velocityAdjustmentFactor * (currentBallVeloicty.y < 0 ? -1 : 1)
            );

            const isBallMovingAwayFromCornerX =
              (closestCorner.dx < 0 && currentBallVeloicty.x > 0) ||
              (closestCorner.dx > 0 && currentBallVeloicty.x < 0);

            const isBallMovingAwayFromCornerY =
              (closestCorner.dy < 0 && currentBallVeloicty.y > 0) ||
              (closestCorner.dy > 0 && currentBallVeloicty.y < 0);

            this.velocity = new Vector(
              !isBallMovingAwayFromCornerX && !isBallMovingAwayFromCornerY
                ? currentBallVeloicty.y * this.bounceDecay * -closestCorner.dx
                : currentBallVeloicty.x * (isBallMovingAwayFromCornerX ? 1 : -1),
              !isBallMovingAwayFromCornerX && !isBallMovingAwayFromCornerY
                ? currentBallVeloicty.x * this.bounceDecay * -closestCorner.dy
                : currentBallVeloicty.y * this.bounceDecay * (isBallMovingAwayFromCornerY ? 1 : -1)
            );

            this.rotation = this.velocity.x * this.rotationFactor + this.velocity.y * this.rotationFactor;
          }
        }
      }
    }
  };

  /**
   * Handles a collision with a wall
   * @param { "x" | "y" } direction - The direction of the collision
   **/
  handleOrthoganalCollision = (direction: "x" | "y", adjustment: number) => {
    const collisionAxis = direction;
    const orthoganalAxis = direction === "x" ? "y" : "x";

    this.center[collisionAxis] -= adjustment * (this.velocity[collisionAxis] < 0 ? -1 : 1);
    // Don't make this adjustment if the ball is moving vertically and is moving slowly
    if (collisionAxis === "x" || this.velocity.y > this.gravity) {
      this.center[orthoganalAxis] -=
        Math.round((adjustment * this.velocity[orthoganalAxis]) / this.velocity[collisionAxis]) *
        (this.velocity[orthoganalAxis] < 0 ? -1 : 1);
    }

    this.velocity[collisionAxis] = -this.velocity[collisionAxis] * this.bounceDecay;
    this.velocity[orthoganalAxis] = this.velocity[orthoganalAxis] * this.orthoginalFriction;
    this.rotation = this.velocity[orthoganalAxis] * this.rotationFactor;
  };

  /**
   * Recurrsively determines how much
   * @param edge The edge to check
   * @returns
   */
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

  setBallType = (ballType: BallType) => {
    this.gravity = ballType.gravity;
    this.bounceDecay = ballType.bounceDecay;
    this.orthoginalFriction = ballType.orthoginalFriction;
    this.rotationFactor = ballType.rotationFactor;

    const oldScale = this.scale;
    this.scale = ballType.scale;
    this.width = Math.round(this.width * (this.scale / oldScale));
    this.height = Math.round(this.height * (this.scale / oldScale));
    this.radius = this.width / 2;
    this.offset = { x: this.width / 2, y: this.height / 2 };

    this.img.src = ballType.imgSrc;
  };
}
