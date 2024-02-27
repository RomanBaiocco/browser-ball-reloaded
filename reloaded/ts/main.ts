import ballImage from "../ball.png";
import { INTERSECTION_INDEXES } from "./intersectionIndexes";

type BrowserBallWindow = Window &
  typeof globalThis & {
    quadRef: number; // index in quads.list
  };

type BrowserBallQuad = {
  windowRef: BrowserBallWindow;
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;

  topLeftCorner: Point;
  bottomRightCorner: Point;
};

type Vector = {
  x: number;
  y: number;
};

type Point = {
  x: number;
  y: number;
};

type Corner = {
  x: number;
  y: number;
  dx: number;
  dy: number;
};

type Edge = {
  point1: Point;
  point2: Point;
};

// Relative to the center of the ball
enum BallCorner {
  TopLeft = "TopLeft",
  TopRight = "TopRight",
  BottomRight = "BottomRight",
  BottomLeft = "BottomLeft",
}

const RENDER_RATE_IN_MS = 15;
const CHILD_DIMENSIONS = {
  childWidth: 300,
  childHeight: 300,
};

const GRAVITY = 1;
const BOUNCE_DECAY = 0.89;
const ORTHOGINAL_VELOCITY_DECAY = 0.97;
const ROTATION_FACTOR = 0.015;

{
  var browserball = (function () {
    const ball = {
      dragging: true,
      img: new Image(),
      angle: 0,
      rotation: 0,
      scale: 1,
      width: 90,
      height: 90,
      radius: 0,
      center: {
        x: 0,
        y: 0,
      } as Point,
      offset: {
        x: 0,
        y: 0,
      },
      initialDragPoint: {
        x: 0,
        y: 0,
      } as Point,
      velocity: {
        x: 0,
        y: 0,
      } as Vector,

      inside: function (p: Point) {
        const distanceFromCenter = Math.sqrt((this.center.x - p.x) ** 2 + (this.center.y - p.y) ** 2);
        return this.offset.x >= distanceFromCenter;
      },

      corners: function () {
        return {
          [BallCorner.TopLeft]: {
            x: this.center.x - this.offset.x,
            y: this.center.y - this.offset.y,
          },
          [BallCorner.TopRight]: {
            x: this.center.x + this.offset.x,
            y: this.center.y - this.offset.y,
          },
          [BallCorner.BottomRight]: {
            x: this.center.x + this.offset.x,
            y: this.center.y + this.offset.y,
          },
          [BallCorner.BottomLeft]: {
            x: this.center.x - this.offset.x,
            y: this.center.y + this.offset.y,
          },
        };
      },

      /**
       * @param { "x" | "y" } direction - The direction of the collision
       **/
      handleOrthoganalCollision: function (direction: "x" | "y", adjustment: number) {
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
      },
    };

    const worldReference = {
      point: { x: Infinity, y: Infinity },

      // Finds the top-left corner of the world and updates the ball's position relative to the difference between the old and new top-left corners
      update: function () {
        const oldPoint = { ...worldReference.point };

        worldReference.point = {
          x: quads.list.reduce((min, quad) => Math.min(min, quad.windowRef.screenX), Infinity),
          y: quads.list.reduce((min, quad) => Math.min(min, quad.windowRef.screenY), Infinity),
        };

        ball.center.x += oldPoint.x - worldReference.point.x;
        ball.center.y += oldPoint.y - worldReference.point.y;
      },
    };

    const quads = {
      list: [] as BrowserBallQuad[],
      corners: [] as Corner[],
      add: function (newWindow: BrowserBallWindow) {
        newWindow.quadRef = quads.list.length;
        const canvas = newWindow.document.getElementById("stage") as HTMLCanvasElement;

        this.list.push({
          windowRef: newWindow,
          canvas: canvas,
          context: canvas.getContext("2d"),
          topLeftCorner: {
            x: newWindow.screenX - worldReference.point.x,
            y: newWindow.screenY - worldReference.point.y,
          },
          bottomRightCorner: {
            x: newWindow.screenX + newWindow.innerWidth - worldReference.point.x,
            y: newWindow.screenY + newWindow.innerHeight - worldReference.point.y,
          },
        });

        worldReference.update();
        quads.update();
      },

      remove: function (indexToRemove: number) {
        const [removedWindow] = quads.list.splice(indexToRemove, 1);
        removedWindow.canvas = null;
        removedWindow.context = null;

        quads.list.forEach((quad, i) => (quad.windowRef.quadRef = i));
        // windows.list.forEach((quad, i) => (quad.quadRef = i)); // I think this is a bug

        return removedWindow.windowRef;
      },

      getNewEdges: function (quad: BrowserBallQuad): [Edge, Edge, Edge, Edge] {
        return [
          {
            // Top edge
            point1: { x: quad.topLeftCorner.x, y: quad.topLeftCorner.y },
            point2: { x: quad.bottomRightCorner.x, y: quad.topLeftCorner.y },
          },
          {
            // Right edge
            point1: { x: quad.bottomRightCorner.x, y: quad.topLeftCorner.y },
            point2: { x: quad.bottomRightCorner.x, y: quad.bottomRightCorner.y },
          },
          {
            // Bottom edge
            point1: { x: quad.bottomRightCorner.x, y: quad.bottomRightCorner.y },
            point2: { x: quad.topLeftCorner.x, y: quad.bottomRightCorner.y },
          },
          {
            // Left edge
            point1: { x: quad.topLeftCorner.x, y: quad.bottomRightCorner.y },
            point2: { x: quad.topLeftCorner.x, y: quad.topLeftCorner.y },
          },
        ];
      },

      update: function () {
        // Clear the corners array
        quads.corners = [];

        // Update the position of each quad relative to the top-left corner of the world
        quads.list.forEach((quad) => {
          quad.topLeftCorner = {
            x: quad.windowRef.screenX - worldReference.point.x,
            y: quad.windowRef.screenY - worldReference.point.y,
          };
          quad.bottomRightCorner = {
            x: quad.windowRef.screenX + quad.windowRef.innerWidth - worldReference.point.x,
            y: quad.windowRef.screenY + quad.windowRef.innerHeight - worldReference.point.y,
          };
        });

        // Loop through each pair of windows and find their corners and add them to the corners array
        quads.list.forEach((outerWindow, outerWindowIndex) => {
          for (let innerWindowIndex = outerWindowIndex + 1; innerWindowIndex < quads.list.length; innerWindowIndex++) {
            quads.updateWorldCorners(outerWindow, quads.list[innerWindowIndex]);
          }
        });
      },

      updateWorldCorners: function (window1: BrowserBallQuad, window2: BrowserBallQuad) {
        const window1Edges = this.getNewEdges(window1);
        const window2Edges = this.getNewEdges(window2);

        INTERSECTION_INDEXES.forEach(([w1I, w2I]) => {
          const window1Edge = window1Edges[w1I];
          const window2Edge = window2Edges[w2I];
          const intersection = quads.sIntersection(window1Edge, window2Edge);

          if (intersection && !quads.pInsideAny(intersection)) {
            let dx = 0;
            let dy = 0;

            // See an explanation of dx and dy @ ~/docs/dx-dy-explination.png
            if (isVertical(window1Edge)) {
              dx = window1Edge.point1.y < window1Edge.point2.y ? 1 : -1;
              dy = window2Edge.point1.x < window2Edge.point2.x ? -1 : 1;
            } else {
              dx = window2Edge.point1.y < window2Edge.point2.y ? 1 : -1;
              dy = window1Edge.point1.x < window1Edge.point2.x ? -1 : 1;
            }

            quads.corners.push({
              x: intersection.x,
              y: intersection.y,
              dx,
              dy,
            });
          }
        });
      },

      sIntersection: function (argLine1: Edge, argLine2: Edge) {
        // Create local copies
        const line1: Edge = {
          point1: { ...argLine1.point1 },
          point2: { ...argLine1.point2 },
        };
        const line2: Edge = {
          point1: { ...argLine2.point1 },
          point2: { ...argLine2.point2 },
        };

        normalizeEdge(line1);
        normalizeEdge(line2);

        // Intersection logic : TODO: Explain this better
        if (line1.point1.x == line1.point2.x) {
          if (
            line1.point1.x >= line2.point1.x &&
            line1.point1.x <= line2.point2.x &&
            line2.point1.y >= line1.point1.y &&
            line2.point2.y <= line1.point2.y
          ) {
            return {
              x: line1.point1.x,
              y: line2.point1.y,
            };
          }
        } else {
          if (
            line2.point1.x >= line1.point1.x &&
            line2.point1.x <= line1.point2.x &&
            line1.point1.y >= line2.point1.y &&
            line1.point2.y <= line2.point2.y
          ) {
            return {
              x: line2.point1.x,
              y: line1.point1.y,
            };
          }
        }

        // No intersection found
        return null;
      },

      pInside: function (point: Point, quad: BrowserBallQuad) {
        return !!(
          point.x >= quad.topLeftCorner.x &&
          point.x <= quad.bottomRightCorner.x &&
          point.y >= quad.topLeftCorner.y &&
          point.y <= quad.bottomRightCorner.y
        );
      },

      pInsideNotEdge: function (point: Point, quad: BrowserBallQuad) {
        return !!(
          point.x > quad.topLeftCorner.x &&
          point.x < quad.bottomRightCorner.x &&
          point.y > quad.topLeftCorner.y &&
          point.y < quad.bottomRightCorner.y
        );
      },

      pInsideAny: function (point: Point) {
        return quads.list.some((quad) => quads.pInsideNotEdge(point, quad));
      },

      // Todo this more readable
      sInside: function (point1: Point, point2: Point): number {
        const edge = { point1, point2 };

        for (const quad of quads.list) {
          const isPoint1InsideQuad = quads.pInside(point1, quad);
          const isPoint2InsideQuad = quads.pInside(point2, quad);

          if (isPoint1InsideQuad && isPoint2InsideQuad) {
            return isVertical(edge) ? point2.y - point1.y : point2.x - point1.x;
          } else {
            if (isPoint1InsideQuad && !isPoint2InsideQuad) {
              if (isVertical(edge)) {
                const newPoint1 = { x: point1.x, y: quad.bottomRightCorner.y + 1 };
                const newPoint2 = { x: point2.x, y: point2.y };

                return quad.bottomRightCorner.y - point1.y + 1 + quads.sInside(newPoint1, newPoint2);
              } else {
                const newPoint1 = { x: quad.bottomRightCorner.x + 1, y: point1.y };
                const newPoint2 = { x: point2.x, y: point2.y };

                return quad.bottomRightCorner.x - point1.x + 1 + quads.sInside(newPoint1, newPoint2);
              }
            } else {
              if (!isPoint1InsideQuad && isPoint2InsideQuad) {
                if (isVertical(edge)) {
                  const newPoint1 = { x: point1.x, y: point1.y };
                  const newPoint2 = { x: point2.x, y: quad.topLeftCorner.y - 1 };
                  return point2.y - quad.topLeftCorner.y + 1 + quads.sInside(newPoint1, newPoint2);
                } else {
                  const newPoint1 = { x: point1.x, y: point1.y };
                  const newPoint2 = { x: quad.topLeftCorner.x - 1, y: point2.y };
                  return point2.x - quad.topLeftCorner.x + 1 + quads.sInside(newPoint1, newPoint2);
                }
              }
            }
          }
        }

        return 0;
      },
    };

    const ballDraggingManager = (function () {
      let velocity: Vector | null = null;
      let lastDragPoint: Point | null = null; 

      return {
        down: function (event: MouseEvent) {
          const clickedWindow = (event.target as Element).ownerDocument.defaultView as BrowserBallWindow;
          if (!clickedWindow) return;

          const clickedPoint = {
            x: clickedWindow.screenX - worldReference.point.x + event.clientX,
            y: clickedWindow.screenY - worldReference.point.y + event.clientY,
          };

          if (ball.inside(clickedPoint)) {
            ball.dragging = true;
            ball.rotation = 0;
            ball.initialDragPoint = {
              x: ball.center.x - clickedPoint.x,
              y: ball.center.y - clickedPoint.y,
            };
            velocity = {
              x: 0,
              y: 0,
            };
            lastDragPoint = clickedPoint;
            clickedWindow.addEventListener("mousemove", ballDraggingManager.track, false);
          }
        },

        track: function (event: MouseEvent) {
          const clickedWindow = (event.target as Element).ownerDocument.defaultView as BrowserBallWindow;
          if (!clickedWindow) return;

          if (!lastDragPoint || !velocity) throw new Error("track: lastDragPoint or velocity not found");

          const currentDragPoint = {
            x: clickedWindow.screenX - worldReference.point.x + event.clientX,
            y: clickedWindow.screenY - worldReference.point.y + event.clientY,
          };

          ball.center = {
            x: currentDragPoint.x + ball.initialDragPoint.x,
            y: currentDragPoint.y + ball.initialDragPoint.y,
          };

          velocity.x = currentDragPoint.x - lastDragPoint.x;
          velocity.y = currentDragPoint.y - lastDragPoint.y;
          lastDragPoint = currentDragPoint;
        },

        up: function (event: MouseEvent) {
          const clickedWindow = (event.target as Element).ownerDocument.defaultView as BrowserBallWindow;
          if (!clickedWindow) return;

          if (ball.dragging && velocity) {
            clickedWindow.removeEventListener("mousemove", ballDraggingManager.track, false);
            ball.velocity.x = Math.abs(velocity.x) > 20 ? (velocity.x < 0 ? -1 : 1) * 20 : velocity.x;
            ball.velocity.y = Math.abs(velocity.y) > 20 ? (velocity.y < 0 ? -1 : 1) * 20 : velocity.y;
            velocity = null;
            lastDragPoint = null;
            ball.initialDragPoint = {
              x: 0,
              y: 0,
            };
            ball.dragging = false;
          }
        },
      };
    })();

    const onResizeWindow = function (event: UIEvent) {
      const resizedWindow = event.target as BrowserBallWindow;
      const resizedWindowCanvas = quads.list.at(resizedWindow.quadRef)?.canvas;
      if (!resizedWindowCanvas) throw new Error("onResizeWindow: Canvas not found");

      resizedWindowCanvas.width = resizedWindow.innerWidth;
      resizedWindowCanvas.height = resizedWindow.innerHeight;

      worldReference.update();
      quads.update();
    };

    const checkForWorldUpdate = function () {
      const worldShouldUpdate = quads.list.some(
        (quad) =>
          quad.topLeftCorner.x != quad.windowRef.screenX - worldReference.point.x ||
          quad.topLeftCorner.y != quad.windowRef.screenY - worldReference.point.y
      );

      if (worldShouldUpdate) {
        worldReference.update();
        quads.update();
      }
    };

    const handleCollision = function () {
      const ballCorners = ball.corners();

      // How much of each ball edge is outside the world
      const ballEdgeOutsideWorld = [
        // Top edge
        ball.width - quads.sInside(ballCorners[BallCorner.TopLeft], ballCorners[BallCorner.TopRight]),
        // Right edge
        ball.height - quads.sInside(ballCorners[BallCorner.TopRight], ballCorners[BallCorner.BottomRight]),
        // Bottom edge
        ball.width - quads.sInside(ballCorners[BallCorner.BottomLeft], ballCorners[BallCorner.BottomRight]),
        // Left edge
        ball.height - quads.sInside(ballCorners[BallCorner.TopLeft], ballCorners[BallCorner.BottomLeft]),
      ];

      if (ballEdgeOutsideWorld.some((edge) => !!edge)) {
        let amountOfEdgeOutOfWindow = 0;
        let edgesAtLeastPartiallyInsideWindow = 0;

        let isSideCollision = false;

        for (let edgeIndex = 0; edgeIndex < 4; edgeIndex++) {
          // If the entiry of the edge is outside the world
          if (ballEdgeOutsideWorld[edgeIndex] == ball.width) {
            let edge1 = ballEdgeOutsideWorld[(edgeIndex + 3) % 4];
            edge1 = edge1 == ball.width ? 0 : edge1;
            let edge2 = ballEdgeOutsideWorld[(edgeIndex + 1) % 4];
            edge2 = edge2 == ball.width ? 0 : edge2;
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
          ball.handleOrthoganalCollision("x", amountOfEdgeOutOfWindow);
        } else if (amountOfEdgeOutOfWindow && !isSideCollision) {
          // Handle hitting a top or bottom wall
          ball.handleOrthoganalCollision("y", amountOfEdgeOutOfWindow);
        } else if (edgesAtLeastPartiallyInsideWindow !== 3) {
          // Handle hitting a corner
          const { closestCornerIndex, distanceToClosestCorner } = quads.corners.reduce(
            (acc, corner, cornerIndex) => {
              const distanceVector = {
                x: ball.center.x - corner.x,
                y: ball.center.y - corner.y,
              };
              const distanceToCorner = Math.sqrt(distanceVector.x ** 2 + distanceVector.y ** 2);
              if (distanceToCorner < acc.distanceToClosestCorner) {
                return { closestCornerIndex: cornerIndex, distanceToClosestCorner: distanceToCorner };
              }
              return acc;
            },
            { closestCornerIndex: -1, distanceToClosestCorner: Infinity }
          );

          if (closestCornerIndex >= 0) {
            const closestCorner = quads.corners[closestCornerIndex];

            const isBallInsideOfCornerX =
              closestCorner.dx > 0 ? ball.center.x > closestCorner.x : ball.center.x < closestCorner.x;
            const isBallInsideOfCornerY =
              closestCorner.dy > 0 ? ball.center.y > closestCorner.y : ball.center.y < closestCorner.y;

            if ((isBallInsideOfCornerX || isBallInsideOfCornerY) && !(isBallInsideOfCornerX && isBallInsideOfCornerY)) {
              if (isBallInsideOfCornerX) {
                // Handle like it hit a top or bottom wall
                const verticalDistanceFromCorner = ball.radius - Math.abs(ball.center.y - closestCorner.y);
                ball.handleOrthoganalCollision("y", verticalDistanceFromCorner);
              } else {
                // Handle like it hit a left or right wall
                const horizontalDistanceFromCorner = ball.radius - Math.abs(ball.center.x - closestCorner.x);
                ball.handleOrthoganalCollision("x", horizontalDistanceFromCorner);
              }
            } else if (distanceToClosestCorner < ball.radius) {
              // Hit corner in a way that the ball is entirely inside or outside the corner
              const currentBallVeloictyX = ball.velocity.x;
              const currentBallVeloictyY = ball.velocity.y;

              const velocityAdjustmentFactor =
                (ball.radius - distanceToClosestCorner) /
                Math.sqrt(currentBallVeloictyX ** 2 + currentBallVeloictyY ** 2);

              ball.center.x -= Math.round(currentBallVeloictyX * velocityAdjustmentFactor);
              ball.center.y -= Math.round(
                currentBallVeloictyY * velocityAdjustmentFactor * (currentBallVeloictyY < 0 ? -1 : 1)
              );

              const isBallMovingAwayFromCornerX =
                (closestCorner.dx < 0 && currentBallVeloictyX > 0) ||
                (closestCorner.dx > 0 && currentBallVeloictyX < 0);

              const isBallMovingAwayFromCornerY =
                (closestCorner.dy < 0 && currentBallVeloictyY > 0) ||
                (closestCorner.dy > 0 && currentBallVeloictyY < 0);

              ball.velocity.x =
                !isBallMovingAwayFromCornerX && !isBallMovingAwayFromCornerY
                  ? currentBallVeloictyY * BOUNCE_DECAY * -closestCorner.dx
                  : currentBallVeloictyX * (isBallMovingAwayFromCornerX ? 1 : -1);
              ball.velocity.y =
                !isBallMovingAwayFromCornerX && !isBallMovingAwayFromCornerY
                  ? currentBallVeloictyX * BOUNCE_DECAY * -closestCorner.dy
                  : currentBallVeloictyY * BOUNCE_DECAY * (isBallMovingAwayFromCornerY ? 1 : -1);

              ball.rotation = ball.velocity.x * ROTATION_FACTOR + ball.velocity.y * ROTATION_FACTOR;
            }
          }
        }
      }
    };

    const renderBall = function () {
      if (!ball.dragging) {
        ball.velocity.y += GRAVITY;
        if (Math.abs(ball.velocity.x) < 1) ball.velocity.x = 0;
        if (Math.abs(ball.velocity.y) < 1) ball.velocity.y = 0;
        ball.center.x = ball.center.x + Math.round(ball.velocity.x);
        ball.center.y = ball.center.y + Math.round(ball.velocity.y);
        handleCollision();
      }

      quads.list.forEach((quad) => {
        const windowRef = quad.windowRef;
        const windowContext = quad.context;
        if (!windowContext) throw new Error("renderBall: CanvasRenderingContext2D not found");

        const xTranslation = ball.center.x - (windowRef.screenX - worldReference.point.x);
        const yTranslation = ball.center.y - (windowRef.screenY - worldReference.point.y);

        windowContext.save();
        windowContext.clearRect(0, 0, windowRef.innerWidth, windowRef.innerHeight);
        windowContext.translate(xTranslation, yTranslation);
        ball.angle += ball.rotation;
        windowContext.rotate(ball.angle);
        windowContext.drawImage(ball.img, -ball.offset.x, -ball.offset.y, ball.width, ball.height);
        windowContext.restore();
      });
    };

    const cleanup = () => {
      const [_parentRef, ...windowRefs] = quads.list.map((w) => w.windowRef);
      windowRefs.forEach((w) => w.close());

      self.removeEventListener("resize", onResizeWindow, false);
      self.removeEventListener("mousedown", ballDraggingManager.down, false);
      self.removeEventListener("mouseup", ballDraggingManager.up, false);
    };

    // UI Methods
    const createChild = function () {
      window.open(
        "child.html",
        `w${quads.list.length}`,
        `location=no,status=no,menubar=no,toolbar=no,scrollbars=no,status=no,width=${
          CHILD_DIMENSIONS.childWidth
        },height=${CHILD_DIMENSIONS.childHeight},left=${window.screenX - 200},top=${window.screenY + 100}`
      );
    };

    const resetBall = function () {
      ball.dragging = true;
      ball.rotation = 0;
      ball.center.x = window.screenX - worldReference.point.x + window.innerWidth / 2;
      ball.center.y = window.screenY - worldReference.point.y + window.innerHeight / 2;
      ball.center = {
        x: window.screenX - worldReference.point.x + window.innerWidth / 2,
        y: window.screenY - worldReference.point.y + window.innerHeight / 2,
      };
    };

    return {
      init: function () {
        const parentWindowStage = document.getElementById("stage") as HTMLCanvasElement | null;
        if (!parentWindowStage || !parentWindowStage.getContext) throw new Error("Canvas not found or not supported");

        parentWindowStage.width = window.innerWidth;
        parentWindowStage.height = window.innerHeight;

        // Add event listeners
        window.addEventListener("resize", onResizeWindow, false);
        window.addEventListener("mousedown", ballDraggingManager.down, false);
        window.addEventListener("mouseup", ballDraggingManager.up, false);
        window.onunload = cleanup;

        // Create buttons
        const createWindowButton = document.createElement("a");
        createWindowButton.appendChild(document.createTextNode("Create Window"));
        createWindowButton.className = "child";
        document.body.appendChild(createWindowButton);
        createWindowButton.addEventListener("click", createChild, false);

        const resetBallButton = document.createElement("a");
        resetBallButton.appendChild(document.createTextNode("Reset Ball"));
        resetBallButton.className = "reset";
        document.body.appendChild(resetBallButton);
        resetBallButton.addEventListener("click", resetBall, false);

        quads.add(self as BrowserBallWindow);

        // Initialize ball
        ball.width *= ball.scale;
        ball.height *= ball.scale;
        ball.radius = ball.width / 2;
        ball.offset = { x: ball.width / 2, y: ball.height / 2 };
        ball.center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        ball.img.onload = function () {
          setInterval(renderBall, RENDER_RATE_IN_MS);
        };
        ball.img.src = ballImage;
        setInterval(checkForWorldUpdate, 250);
      },

      addChild: function (childWindow: BrowserBallWindow) {
        const childStage = childWindow.document.getElementById("stage") as HTMLCanvasElement | null;
        if (!childStage || !childStage.getContext) throw new Error("Canvas not found or not supported");

        childStage.width = childWindow.innerWidth;
        childStage.height = childWindow.innerHeight;

        // Add event listeners
        childWindow.addEventListener("resize", onResizeWindow, false);
        childWindow.addEventListener("mousedown", ballDraggingManager.down, false);
        childWindow.addEventListener("mouseup", ballDraggingManager.up, false);
        childWindow.onunload = this.removeChild;

        quads.add(childWindow);
      },

      removeChild: function () {
        // @ts-expect-error - this is a BrowserballWindow but maybe not forever, so be careful
        const childWindowAgain = quads.remove(this.quadRef);
        childWindowAgain.removeEventListener("resize", onResizeWindow, false);
        childWindowAgain.removeEventListener("mousedown", ballDraggingManager.down, false);
        childWindowAgain.removeEventListener("mouseup", ballDraggingManager.up, false);
      },
    };
  })();
}

// @ts-expect-error
window.browserball = browserball;
browserball.init();

// Helper functions I added to make the code more readable
function normalizeEdge(edge: Edge) {
  const edgePoint1Copy = { ...edge.point1 };
  const edgePoint2Copy = { ...edge.point2 };

  edge.point1 = {
    x: Math.min(edgePoint1Copy.x, edgePoint2Copy.x),
    y: Math.min(edgePoint1Copy.y, edgePoint2Copy.y),
  };

  edge.point2 = {
    x: Math.max(edgePoint1Copy.x, edgePoint2Copy.x),
    y: Math.max(edgePoint1Copy.y, edgePoint2Copy.y),
  };
}

function isVertical(edge: Edge) {
  return edge.point1.x === edge.point2.x;
}
