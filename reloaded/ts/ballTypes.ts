import defaultBallImage from "../assets/ball.png";
import bowlingBallImage from "../assets/bowling_ball.png";
import tennisBallImage from "../assets/tennis_ball.png";

export type BallType = {
  name: string;

  // Physics
  gravity: number;
  bounceDecay: number;
  orthoginalFriction: number;
  rotationFactor: number;

  // Visual
  scale: number;
  imgSrc: string;
};

export const BALL_TYPES: BallType[] = [
  {
    name: "default",
    gravity: 1,
    bounceDecay: 0.89,
    orthoginalFriction: 0.97,
    rotationFactor: 0.015,
    scale: 1,
    imgSrc: defaultBallImage,
  },
  {
    name: "bowling",
    gravity: 1.5,
    bounceDecay: 0.25,
    orthoginalFriction: 0.45,
    rotationFactor: 0.005,
    scale: 1.1,
    imgSrc: bowlingBallImage,
  },
  {
    name: "tennis",
    gravity: 0.5,
    bounceDecay: 0.95,
    orthoginalFriction: 0.99,
    rotationFactor: 0.01,
    scale: 0.5,
    imgSrc: tennisBallImage,
  },
];

export const DEFAULT_BALL_TYPE = BALL_TYPES[1];
