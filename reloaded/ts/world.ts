import { Ball } from "./ball";
import { BALL_TYPES, DEFAULT_BALL_TYPE, type BallType } from "./ballTypes";
import { BrowserBallWindow, Corner, Point, Quad, Vector } from "./geometry";
import { INTERSECTION_INDEXES } from "./intersectionIndexes";

const BALL_RENDER_RATE_IN_MS = 15;

const CHILD_DIMENSIONS = {
  childWidth: 300,
  childHeight: 300,
};

export class World {
  /**
   * The top-left corner of the world
   * The x coordinate is the smallest x coordinate of all the windows
   * The y coordinate is the smallest y coordinate of all the windows
   */
  referencePoint: Point = new Point(Infinity, Infinity);
  updateReferencePoint = () => {
    const oldPoint = new Point(this.referencePoint.x, this.referencePoint.y);

    this.referencePoint = new Point(
      this.quads.reduce((min, quad) => Math.min(min, quad.windowRef.screenX), Infinity),
      this.quads.reduce((min, quad) => Math.min(min, quad.windowRef.screenY), Infinity),
    );

    if (oldPoint.x === Infinity || oldPoint.y === Infinity) return;
    this.balls.forEach((ball) => ball.updatePosition(oldPoint, this.referencePoint));
  };

  /**
   * An array of quads representing the windows in the world
   */
  quads = [] as Quad[];
  /**
   * An array of corners representing the corners of the world
   */
  corners = [] as Corner[];
  /**
   * Adds a new quad to the world
   * @param newWindow The window that contains the quad
   */
  addQuad = (newWindow: BrowserBallWindow) => {
    newWindow.quadRef = this.quads.length;

    this.quads.push(new Quad({ windowRef: newWindow, world: this }));

    this.updateReferencePoint();
    this.updateQuads();
  };
  /**
   * Removes a quad from the world
   * @param indexToRemove The index of the quad to remove
   */
  removeQuad = (indexToRemove: number) => {
    const [removedWindow] = this.quads.splice(indexToRemove, 1);

    this.quads.forEach((quad, i) => (quad.windowRef.quadRef = i));

    return removedWindow.windowRef;
  };
  /**
   * Updates each quad's position and updates the corners array
   */
  updateQuads = () => {
    this.corners = [];
    this.quads.forEach((quad) => quad.updatePosition(this.referencePoint));

    // Loop through each pair of windows and find their corners and add them to the corners array
    this.quads.forEach((quad1, quad1Index) => {
      for (let quad2Index = quad1Index + 1; quad2Index < this.quads.length; quad2Index++) {
        this.corners = [...this.corners, ...this.findWorldCorners(quad1, this.quads[quad2Index])];
      }
    });
  };
  /**
   * Given two quads, find the corners of the world that are created by the intersection of the quads.
   * An intersection is only a wolrd corner if it is not inside any of the other quads.
   * @param quad1 The first quad
   * @param quad2 The second quad
   */
  findWorldCorners = (quad1: Quad, quad2: Quad) => {
    const quad1Edges = quad1.edges();
    const quad2Edges = quad2.edges();

    return INTERSECTION_INDEXES.flatMap(([q1I, q2I]) => {
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

        return new Corner(intersection.x, intersection.y, dx, dy);
      } else {
        return [];
      }
    });
  };
  pointInsideAnyQuad = (point: Point) => {
    return this.quads.some((quad) => quad.pointInsideNotEdge(point));
  };

  /**
   * Checks if the world has been updated and updates the reference point and quads if it has
   */
  checkForWorldUpdate = () => {
    const worldShouldUpdate = this.quads.some(
      (quad) =>
        quad.topLeftCorner.x != quad.windowRef.screenX - this.referencePoint.x ||
        quad.topLeftCorner.y != quad.windowRef.screenY - this.referencePoint.y,
    );

    if (worldShouldUpdate) {
      this.updateReferencePoint();
      this.updateQuads();
    }
  };
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
      },height=${CHILD_DIMENSIONS.childHeight},left=${window.screenX - 200},top=${window.screenY + 100}`,
    );
  };
  initChild = (childWindow: BrowserBallWindow) => {
    const childWindowStage = childWindow.document.getElementById("stage") as HTMLCanvasElement | null;
    if (!childWindowStage || !childWindowStage.getContext) throw new Error("Canvas not found or not supported");

    childWindowStage.width = CHILD_DIMENSIONS.childWidth;
    childWindowStage.height = CHILD_DIMENSIONS.childHeight;

    childWindow.addEventListener("resize", this.onResizeWindow, false);
    childWindow.addEventListener("mousedown", this.ballDraggingManager.down, false);
    childWindow.addEventListener("mouseup", this.ballDraggingManager.up, false);

    this.addQuad(childWindow);
    childWindow.onbeforeunload = () => this.removeChild(childWindow);
  };
  removeChild = (childWindow: BrowserBallWindow) => {
    this.removeQuad(childWindow.quadRef);
    childWindow.removeEventListener("resize", this.onResizeWindow, false);
    childWindow.removeEventListener("mousedown", this.ballDraggingManager.down, false);
    childWindow.removeEventListener("mouseup", this.ballDraggingManager.up, false);
  };

  rotationCanvas = document.createElement("canvas");

  balls: Ball[] = [new Ball(this)];
  ballDraggingManager = new BallDraggingManager(this);
  renderBalls = () => {
    this.quads.forEach((quad) => quad.context.clearRect(0, 0, quad.windowRef.innerWidth, quad.windowRef.innerHeight));

    this.balls.forEach((ball) => ball.render());
  };
  /**
   * Resets the ball to the center of the parent window
   */
  resetBall = () => {
    const newBall = new Ball(this);
    newBall.dragging = true;
    newBall.rotation = 0;
    newBall.center = new Point(
      window.screenX - this.referencePoint.x + window.innerWidth / 2,
      window.screenY - this.referencePoint.y + window.innerHeight / 2,
    );
    this.balls = [newBall];
  };
  createBall = () => {
    const newBall = new Ball(this, this.mostRecentBallType);
    newBall.dragging = false;
    newBall.rotation = 0;
    newBall.center = new Point(
      window.screenX - this.referencePoint.x + window.innerWidth / 2,
      window.screenY - this.referencePoint.y + window.innerHeight / 2,
    );
    this.balls.push(newBall);
  };

  mostRecentBallType: BallType = DEFAULT_BALL_TYPE;
  bonusWindow: Window | null = null;
  openBonusWindow = () =>
    window.open(
      "bonus.html",
      "bonus",
      "location=no,status=no,menubar=no,toolbar=no,scrollbars=no,status=no,width=150,height=300",
    );
  initBonus = (bonusWindow: Window) => {
    this.bonusWindow = bonusWindow;
    const ballSettings = bonusWindow.document.getElementById("ball-settings");
    if (!ballSettings) throw new Error("Ball settings not found");

    BALL_TYPES.forEach((ballType) => {
      const setBallTypeButton = bonusWindow.document.createElement("button");
      setBallTypeButton.appendChild(bonusWindow.document.createTextNode(ballType.name));
      ballSettings.appendChild(setBallTypeButton);
      setBallTypeButton.addEventListener(
        "click",
        () => {
          this.balls.at(0)?.setBallType(ballType);
          this.mostRecentBallType = ballType;
        },
        false,
      );
    });

    const actions = bonusWindow.document.getElementById("actions");
    if (!actions) throw new Error("Actions not found");

    const createBallButton = bonusWindow.document.createElement("button");
    createBallButton.appendChild(bonusWindow.document.createTextNode("Create Ball"));
    createBallButton.addEventListener("click", this.createBall, false);
    actions.appendChild(createBallButton);
  };

  constructor() {
    const parentWindowStage = document.getElementById("stage") as HTMLCanvasElement | null;
    if (!parentWindowStage || !parentWindowStage.getContext) throw new Error("Canvas not found or not supported");

    parentWindowStage.width = window.innerWidth;
    parentWindowStage.height = window.innerHeight;

    // Add event listeners
    window.addEventListener("resize", this.onResizeWindow, false);
    window.addEventListener("mousedown", this.ballDraggingManager.down, false);
    window.addEventListener("mouseup", this.ballDraggingManager.up, false);
    window.onbeforeunload = this.cleanup;

    // Create buttons
    const createWindowButton = document.createElement("a");
    createWindowButton.appendChild(document.createTextNode("Create Window"));
    createWindowButton.className = "child";
    document.body.appendChild(createWindowButton);
    createWindowButton.addEventListener("click", this.createChild, false);

    const resetBallButton = document.createElement("a");
    resetBallButton.appendChild(document.createTextNode("Reset Ball"));
    resetBallButton.className = "reset";
    document.body.appendChild(resetBallButton);
    resetBallButton.addEventListener("click", this.resetBall, false);

    const openBonusWindowButton = document.createElement("a");
    openBonusWindowButton.appendChild(document.createTextNode("Bonus Features"));
    openBonusWindowButton.className = "bonus";
    document.body.appendChild(openBonusWindowButton);
    openBonusWindowButton.addEventListener("click", this.openBonusWindow, false);

    this.addQuad(self as BrowserBallWindow);
    setInterval(this.checkForWorldUpdate, 250);
    setInterval(this.renderBalls, BALL_RENDER_RATE_IN_MS);
  }

  /**
   * Cleans up the world after the parent window is closed by closing all the child windows
   */
  cleanup = () => {
    const [_parentWindowRef, ...windowRefs] = this.quads.map((quad) => quad.windowRef);
    windowRefs.forEach((w) => w.close());

    self.removeEventListener("resize", this.onResizeWindow);
    self.removeEventListener("mousedown", this.ballDraggingManager.down);
    self.removeEventListener("mouseup", this.ballDraggingManager.up);

    if (this.bonusWindow) this.bonusWindow.close();
  };
}

class BallDraggingManager {
  velocity: Vector | null = null;
  lastDragPoint: Point | null = null;
  activelyDraggedBall: Ball | null = null;
  world: World;

  constructor(world: World) {
    this.world = world;
  }

  down = (event: MouseEvent) => {
    const clickedWindow = (event.target as Element).ownerDocument.defaultView as BrowserBallWindow;
    if (!clickedWindow) return;

    const clickedPoint = new Point(
      clickedWindow.screenX - this.world.referencePoint.x + event.clientX,
      clickedWindow.screenY - this.world.referencePoint.y + event.clientY,
    );

    for (const ball of this.world.balls) {
      if (ball.inside(clickedPoint)) {
        this.activelyDraggedBall = ball;
        this.activelyDraggedBall.dragging = true;
        this.activelyDraggedBall.rotation = 0;
        this.activelyDraggedBall.initialDragPoint = new Point(
          this.activelyDraggedBall.center.x - clickedPoint.x,
          this.activelyDraggedBall.center.y - clickedPoint.y,
        );
        this.velocity = new Vector(0, 0);
        this.lastDragPoint = clickedPoint;
        clickedWindow.addEventListener("mousemove", this.track, false);
        return;
      }
    }
  };

  track = (event: MouseEvent) => {
    if (!this.activelyDraggedBall) return;
    const clickedWindow = (event.target as Element).ownerDocument.defaultView as BrowserBallWindow;
    if (!clickedWindow) return;
    if (!this.lastDragPoint || !this.velocity) throw new Error("track: lastDragPoint or velocity not found");

    const currentDragPoint = new Point(
      clickedWindow.screenX - this.world.referencePoint.x + event.clientX,
      clickedWindow.screenY - this.world.referencePoint.y + event.clientY,
    );

    this.activelyDraggedBall.center = new Point(
      currentDragPoint.x + this.activelyDraggedBall.initialDragPoint.x,
      currentDragPoint.y + this.activelyDraggedBall.initialDragPoint.y,
    );

    this.velocity = new Vector(currentDragPoint.x - this.lastDragPoint.x, currentDragPoint.y - this.lastDragPoint.y);
    this.lastDragPoint = currentDragPoint;
  };

  up = (event: MouseEvent) => {
    if (!this.activelyDraggedBall) return;
    const clickedWindow = (event.target as Element).ownerDocument.defaultView as BrowserBallWindow;
    if (!clickedWindow) return;

    if (this.activelyDraggedBall.dragging && this.velocity) {
      clickedWindow.removeEventListener("mousemove", this.track, false);
      this.activelyDraggedBall.velocity = new Vector(
        Math.abs(this.velocity.x) > 20 ? (this.velocity.x < 0 ? -1 : 1) * 20 : this.velocity.x,
        Math.abs(this.velocity.y) > 20 ? (this.velocity.y < 0 ? -1 : 1) * 20 : this.velocity.y,
      );
      this.velocity = null;
      this.lastDragPoint = null;
      this.activelyDraggedBall.initialDragPoint = new Point(0, 0);
      this.activelyDraggedBall.dragging = false;
    }
  };
}
