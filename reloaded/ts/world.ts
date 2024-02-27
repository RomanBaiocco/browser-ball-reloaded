import { Ball } from "./gameObjects";
import { BrowserBallWindow, Corner, Point, Quad, Vector } from "./geometry";
import { INTERSECTION_INDEXES } from "./intersectionIndexes";

const CHILD_DIMENSIONS = {
  childWidth: 300,
  childHeight: 300,
};

export class World {
  list: Quad[] = [];
  ball: Ball = new Ball();

  /**
   * The top-left corner of the world
   * The x coordinate is the smallest x coordinate of all the windows
   * The y coordinate is the smallest y coordinate of all the windows
   */
  referencePoint = new Point(Infinity, Infinity);
  updateReferencePoint = () => {
    const oldPoint = new Point(this.referencePoint.x, this.referencePoint.y);

    this.referencePoint = new Point(
      this.list.reduce((min, quad) => Math.min(min, quad.windowRef.screenX), Infinity),
      this.list.reduce((min, quad) => Math.min(min, quad.windowRef.screenY), Infinity)
    );

    this.ball.center.x += oldPoint.x - this.referencePoint.x;
    this.ball.center.y += oldPoint.y - this.referencePoint.y;
  };

  quads = [] as Quad[];
  corners = [] as Corner[];
  addQuad = (newWindow: BrowserBallWindow) => {
    newWindow.quadRef = this.quads.length;

    this.list.push(new Quad({ windowRef: newWindow, worldReference: this.referencePoint }));

    this.updateReferencePoint();
    this.updateQuads();
  };
  removeQuad = (indexToRemove: number) => {
    const [removedWindow] = this.quads.splice(indexToRemove, 1);

    this.quads.forEach((quad, i) => (quad.windowRef.quadRef = i));
    // windows.list.forEach((quad, i) => (quad.quadRef = i)); // I think this is a bug

    return removedWindow.windowRef;
  };
  updateQuads = () => {
    // Clear the corners array
    this.corners = [];

    // Update the position of each quad relative to the top-left corner of the world
    this.quads.forEach((quad) => quad.updatePosition(this.referencePoint));

    // Loop through each pair of windows and find their corners and add them to the corners array
    this.quads.forEach((quad1, quad1Index) => {
      for (let quad2Index = quad1Index + 1; quad2Index < this.quads.length; quad2Index++) {
        this.updateWorldCorners(quad1, this.quads[quad2Index]);
      }
    });
  };
  updateWorldCorners = (quad1: Quad, quad2: Quad) => {
    const quad1Edges = quad1.edges();
    const quad2Edges = quad2.edges();

    INTERSECTION_INDEXES.forEach(([q1I, q2I]) => {
      const quad1Edge = quad1Edges[q1I];
      const quad2Edge = quad2Edges[q2I];
      const intersection = quad1Edge.getIntersection(quad2Edge);

      if (intersection && !this.pointInsideAnyQuad(intersection)) {
        let dx = 0;
        let dy = 0;

        // See an explanation of dx and dy @ ~/docs/dx-dy-explination.png
        if (quad1Edge.isVertical()) {
          dx = quad1Edge.point1.y < quad1Edge.point2.y ? 1 : -1;
          dy = quad2Edge.point1.x < quad2Edge.point2.x ? -1 : 1;
        } else {
          dx = quad2Edge.point1.y < quad2Edge.point2.y ? 1 : -1;
          dy = quad1Edge.point1.x < quad1Edge.point2.x ? -1 : 1;
        }

        this.corners.push({
          x: intersection.x,
          y: intersection.y,
          dx,
          dy,
        });
      }
    });
  };

  checkForWorldUpdate = () => {
    const worldShouldUpdate = this.quads.some(
      (quad) =>
        quad.topLeftCorner.x != quad.windowRef.screenX - this.referencePoint.x ||
        quad.topLeftCorner.y != quad.windowRef.screenY - this.referencePoint.y
    );

    if (worldShouldUpdate) {
      this.updateReferencePoint();
      this.updateQuads();
    }
  };

  pointInsideAnyQuad = (point: Point) => {
    return this.quads.some((quad) => quad.pointInside(point));
  };

  // Event listeners
  onResizeWindow = (e: Event) => {
    const resizedWindow = e.target as BrowserBallWindow;
    const resizedWindowCanvas = this.quads.at(resizedWindow.quadRef)?.canvas;
    if (!resizedWindowCanvas) throw new Error("onResizeWindow: Canvas not found");

    resizedWindowCanvas.width = resizedWindow.innerWidth;
    resizedWindowCanvas.height = resizedWindow.innerHeight;

    this.updateReferencePoint();
    this.updateQuads();
  };

  createChild = () => {
    window.open(
      "child.html",
      `w${this.quads.length}`,
      `location=no,status=no,menubar=no,toolbar=no,scrollbars=no,status=no,width=${
        CHILD_DIMENSIONS.childWidth
      },height=${CHILD_DIMENSIONS.childHeight},left=${window.screenX - 200},top=${window.screenY + 100}`
    );
  };

  constructor() {
    const parentWindowStage = document.getElementById("stage") as HTMLCanvasElement | null;
    if (!parentWindowStage || !parentWindowStage.getContext) throw new Error("Canvas not found or not supported");

    parentWindowStage.width = window.innerWidth;
    parentWindowStage.height = window.innerHeight;

    // Add event listeners
    window.addEventListener("resize", this.onResizeWindow, false);
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

    this.addQuad(self as BrowserBallWindow);
  }
}

class BallDraggingManager {
  ball: Ball = new Ball();

  velocity: Vector | null = null;
  lastDragPoint: Point | null = null; 

        down = (event: MouseEvent) => {
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
}
