import defaultBallImage from "../assets/ball.png";
import bowlingBallImage from "../assets/bowling_ball.png";
import tennisBallImage from "../assets/tennis_ball.png";
import poolBallImage from "../assets/pool_ball.png";
import antiGravityBallImage from "../assets/anti-gravity_ball.webp";

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
    gravity: 2.5,
    bounceDecay: 0.25,
    orthoginalFriction: 0.45,
    rotationFactor: 0.005,
    scale: 1.1,
    imgSrc: bowlingBallImage,
  },
  {
    name: "tennis",
    gravity: 1.25,
    bounceDecay: 0.95,
    orthoginalFriction: 0.99,
    rotationFactor: 0.01,
    scale: 0.5,
    imgSrc: tennisBallImage,
  },
  {
    name: "pool",
    gravity: 1.75,
    bounceDecay: 0.25,
    orthoginalFriction: 0.85,
    rotationFactor: 0.01,
    scale: 0.4,
    imgSrc: poolBallImage,
  },
  {
    name: "anti-gravity",
    gravity: -1,
    bounceDecay: 0.89,
    orthoginalFriction: 0.97,
    rotationFactor: 0.015,
    scale: 1,
    imgSrc: antiGravityBallImage,
  },
];

export const DEFAULT_BALL_TYPE = BALL_TYPES[0];
