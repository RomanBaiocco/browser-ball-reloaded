import ballImage from "../ball.png";

import { Point, Vector } from "./geometry";

const RENDER_RATE_IN_MS = 15;

enum BallCorner {
  TopLeft = "TopLeft",
  TopRight = "TopRight",
  BottomRight = "BottomRight",
  BottomLeft = "BottomLeft",
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
  center = new Point(0, 0);
  offset = {
    x: 0,
    y: 0,
  };
  initialDragPoint = new Point(0, 0);
  velocity = new Vector(0, 0);

  constructor(options: BallOptions = {}) {
    if (options.scale) {
      this.scale = options.scale;
    }

    this.width *= this.scale;
    this.height *= this.scale;
    this.radius = this.width / 2;
    this.offset = { x: this.width / 2, y: this.height / 2 };
    this.center = new Point(window.innerWidth / 2, window.innerHeight / 2);
    this.img.onload = function () {
      setInterval(renderBall, RENDER_RATE_IN_MS);
    };
    this.img.src = ballImage;
    // setInterval(checkForWorldUpdate, 250);
  }

  inside = (p: Point) => {
    const distanceFromCenter = Math.sqrt((this.center.x - p.x) ** 2 + (this.center.y - p.y) ** 2);
    return this.offset.x >= distanceFromCenter;
  };

  corners = () => {
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
  };
}
