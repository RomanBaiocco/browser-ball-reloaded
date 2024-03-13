import { Edge, Point, Vector } from "./geometry";
import type { World } from "./world";
import { DEFAULT_BALL_TYPE, type BallType } from "./ballTypes";

enum BallEdge {
  Top = "Top",
  Right = "Right",
  Bottom = "Bottom",
  Left = "Left",
}

const BALL_EDGE_INDEXES = {
  [BallEdge.Top]: 0,
  [BallEdge.Right]: 1,
  [BallEdge.Bottom]: 2,
  [BallEdge.Left]: 3,
};

const MAX_BALL_COEFFICIENT_OF_RESTITUTION = 0.8;
const MAX_VELOCITY = 50;

export class Ball {
  // Configurable properties
  gravity;
  wallCoefficientOfRestitution;
  orthoginalFriction;
  rotationFactor;
  scale;
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

  constructor(world: World, ballType: BallType = DEFAULT_BALL_TYPE) {
    this.world = world;

    this.gravity = ballType.gravity;
    this.wallCoefficientOfRestitution = ballType.wallCoefficientOfRestitution;
    this.orthoginalFriction = ballType.orthoginalFriction;
    this.rotationFactor = ballType.rotationFactor;
    this.scale = ballType.scale;
    this.img.src = ballType.imgSrc;

    this.width = Math.round(this.width * this.scale);
    this.height = Math.round(this.height * this.scale);
    this.radius = this.width / 2;
    this.offset = { x: this.width / 2, y: this.height / 2 };
    this.center = new Point(window.innerWidth / 2, window.innerHeight / 2);
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

  updatePosition = (oldWorldReference: Point, newWorldReference: Point) => {
    this.center.x += oldWorldReference.x - newWorldReference.x;
    this.center.y += oldWorldReference.y - newWorldReference.y;
  };

  render = () => {
    if (!this.dragging) {
      this.velocity.y += this.gravity;
      if (Math.abs(this.velocity.x) < Math.abs(this.gravity)) this.velocity.x = 0;
      if (Math.abs(this.velocity.y) < Math.abs(this.gravity)) this.velocity.y = 0;

      if (Math.abs(this.velocity.x) > MAX_VELOCITY) this.velocity.x = Math.sign(this.velocity.x) * MAX_VELOCITY;
      if (Math.abs(this.velocity.y) > MAX_VELOCITY) this.velocity.y = Math.sign(this.velocity.y) * MAX_VELOCITY;

      this.center = new Point(
        this.center.x + Math.min(Math.round(this.velocity.x)),
        this.center.y + Math.round(this.velocity.y),
      );
      this.handleCollision();
    }

    this.world.balls.forEach((otherBall) => {
      if (otherBall !== this) this.handleBallCollision(otherBall);
    });

    this.world.quads.forEach((quad) => {
      const windowRef = quad.windowRef;
      const windowContext = quad.context;
      if (!windowContext) throw new Error("renderBall: CanvasRenderingContext2D not found");

      const rotationCanvasContext = this.world.rotationCanvas.getContext("2d");
      if (!rotationCanvasContext) throw new Error("renderBall: rotation CanvasRenderingContext2D not found");

      this.world.rotationCanvas.width = this.width;
      this.world.rotationCanvas.height = this.height;
      this.angle += this.rotation;

      rotationCanvasContext.clearRect(0, 0, this.world.rotationCanvas.width, this.world.rotationCanvas.height);

      rotationCanvasContext.translate(this.offset.x, this.offset.y);
      rotationCanvasContext.rotate(this.angle);
      rotationCanvasContext.drawImage(this.img, -this.offset.x, -this.offset.y, this.width, this.height);

      const xTranslation = this.center.x - (windowRef.screenX - this.world.referencePoint.x);
      const yTranslation = this.center.y - (windowRef.screenY - this.world.referencePoint.y);

      windowContext.save();
      windowContext.drawImage(
        this.world.rotationCanvas,
        xTranslation - this.offset.x,
        yTranslation - this.offset.y,
        this.width,
        this.height,
      );
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

      let collisionSide: BallEdge | undefined;

      for (const edge of Object.values(BallEdge)) {
        const edgeIndex = BALL_EDGE_INDEXES[edge];

        // If the entiry of the edge is outside the world it means we have an orthoganal collision
        if (ballEdgeOutsideWorld[edgeIndex] == this.width) {
          collisionSide = edge;
          let edge1 = ballEdgeOutsideWorld[(edgeIndex + 3) % 4];
          edge1 = edge1 == this.width ? 0 : edge1;
          let edge2 = ballEdgeOutsideWorld[(edgeIndex + 1) % 4];
          edge2 = edge2 == this.width ? 0 : edge2;
          const edgeOutOfWindow = edge1 > edge2 ? edge1 : edge2;
          if (edgeOutOfWindow > amountOfEdgeOutOfWindow) amountOfEdgeOutOfWindow = edgeOutOfWindow;
        } else {
          edgesAtLeastPartiallyInsideWindow++;
        }
      }

      if (collisionSide) {
        this.handleOrthoganalCollision(collisionSide, amountOfEdgeOutOfWindow);
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
          { closestCornerIndex: -1, distanceToClosestCorner: Infinity },
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
              const collisionSide = this.center.y > closestCorner.y ? BallEdge.Top : BallEdge.Bottom;
              this.handleOrthoganalCollision(collisionSide, verticalDistanceFromCorner);
            } else {
              const horizontalDistanceFromCorner = this.radius - Math.abs(this.center.x - closestCorner.x);
              const collisionSide = this.center.x > closestCorner.x ? BallEdge.Left : BallEdge.Right;
              this.handleOrthoganalCollision(collisionSide, horizontalDistanceFromCorner);
            }
          } else if (distanceToClosestCorner < this.radius) {
            // Hit corner in a way that the ceneter of the ball is entirely inside or outside the corner
            const currentBallVeloicty = this.velocity;

            const velocityAdjustmentFactor =
              (this.radius - distanceToClosestCorner) /
              Math.sqrt(currentBallVeloicty.x ** 2 + currentBallVeloicty.y ** 2);

            this.center.x -= Math.round(currentBallVeloicty.x * velocityAdjustmentFactor);
            this.center.y -= Math.round(
              currentBallVeloicty.y * velocityAdjustmentFactor * (currentBallVeloicty.y < 0 ? -1 : 1),
            );

            const isBallMovingAwayFromCornerX =
              (closestCorner.dx < 0 && currentBallVeloicty.x > 0) ||
              (closestCorner.dx > 0 && currentBallVeloicty.x < 0);

            const isBallMovingAwayFromCornerY =
              (closestCorner.dy < 0 && currentBallVeloicty.y > 0) ||
              (closestCorner.dy > 0 && currentBallVeloicty.y < 0);

            this.velocity = new Vector(
              !isBallMovingAwayFromCornerX && !isBallMovingAwayFromCornerY
                ? currentBallVeloicty.y * this.wallCoefficientOfRestitution * -closestCorner.dx
                : currentBallVeloicty.x * (isBallMovingAwayFromCornerX ? 1 : -1),
              !isBallMovingAwayFromCornerX && !isBallMovingAwayFromCornerY
                ? currentBallVeloicty.x * this.wallCoefficientOfRestitution * -closestCorner.dy
                : currentBallVeloicty.y * this.wallCoefficientOfRestitution * (isBallMovingAwayFromCornerY ? 1 : -1),
            );

            this.rotation = this.velocity.x * this.rotationFactor + this.velocity.y * this.rotationFactor;
          }
        }
      }
    }
  };

  /**
   * Handles a collision with a wall
   * @param { BallEdge } collisionSide - The side of the ball that is colliding with the wall
   * @param { number } adjustment - The amount of the ball that is inside the wall
   **/
  handleOrthoganalCollision = (collisionSide: BallEdge, adjustment: number) => {
    const [collisionAxis, orthoganalAxis] = [BallEdge.Top, BallEdge.Bottom].includes(collisionSide)
      ? (["y", "x"] as const)
      : (["x", "y"] as const);

    const collisionAxisAdjustmentSign = [BallEdge.Top, BallEdge.Left].includes(collisionSide) ? 1 : -1;

    this.center[collisionAxis] += adjustment * collisionAxisAdjustmentSign;

    this.velocity[collisionAxis] = -this.velocity[collisionAxis] * this.wallCoefficientOfRestitution;
    this.velocity[orthoganalAxis] = this.velocity[orthoganalAxis] * this.orthoginalFriction;
    this.rotation = this.velocity[orthoganalAxis] * this.rotationFactor;
  };

  handleBallCollision(otherBall: Ball) {
    const dist = this.center.distanceTo(otherBall.center);
    if (dist < this.radius + otherBall.radius) {
      const overlap = 0.5 * (dist - this.radius - otherBall.radius);

      // Displace the balls away from each other
      this.center.x -= (overlap * (this.center.x - otherBall.center.x)) / dist;
      this.center.y -= (overlap * (this.center.y - otherBall.center.y)) / dist;
      otherBall.center.x += (overlap * (this.center.x - otherBall.center.x)) / dist;
      otherBall.center.y += (overlap * (this.center.y - otherBall.center.y)) / dist;

      const collisionVector = new Vector(
        (otherBall.center.x - this.center.x) / dist,
        (otherBall.center.y - this.center.y) / dist,
      );

      // Relative velocity in normal direction
      const dvx = this.velocity.x - otherBall.velocity.x;
      const dvy = this.velocity.y - otherBall.velocity.y;

      const velocityAdjustmentFactor = (dvx * collisionVector.x + dvy * collisionVector.y) / 1.5;

      this.velocity.x -=
        velocityAdjustmentFactor *
        collisionVector.x *
        Math.min(this.wallCoefficientOfRestitution, MAX_BALL_COEFFICIENT_OF_RESTITUTION);
      this.velocity.y -=
        velocityAdjustmentFactor *
        collisionVector.y *
        Math.min(this.wallCoefficientOfRestitution, MAX_BALL_COEFFICIENT_OF_RESTITUTION);
      otherBall.velocity.x +=
        velocityAdjustmentFactor *
        collisionVector.x *
        Math.min(otherBall.wallCoefficientOfRestitution, MAX_BALL_COEFFICIENT_OF_RESTITUTION);
      otherBall.velocity.y +=
        velocityAdjustmentFactor *
        collisionVector.y *
        Math.min(otherBall.wallCoefficientOfRestitution, MAX_BALL_COEFFICIENT_OF_RESTITUTION);
    }
  }

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
    this.wallCoefficientOfRestitution = ballType.wallCoefficientOfRestitution;
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
