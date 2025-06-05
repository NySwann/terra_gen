import { mkSimplexNoise, type SimplexNoise } from "./perlin";
import { Terrain } from "./Terrain";

function sfc32(a: number, b: number, c: number, d: number) {
  return function () {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export class Generator {
  noise: SimplexNoise;
  random: () => number;

  constructor() {
    const seed = [Math.floor(Math.random() * 100), Math.floor(Math.random() * 100), Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)];
    //const seed = [85, 44, 74, 6];
    console.log("seed", seed);
    this.random = sfc32(seed[0], seed[1], seed[2], seed[3]);
    this.noise = mkSimplexNoise(this.random);
  }

  fill(terrain: Terrain) {
    for (let x = 0; x < terrain.size; x++) {
      for (let y = 0; y < terrain.size; y++) {
        for (let z = 0; z < terrain.size; z++) {
          const sample = this.sample1(x, y, z, terrain.size);
          //if (z > 40)
          terrain.setBlockMaterial(x, y, z, sample ? "solid" : "gaz");
        }
      }
    }
  }

  sample1(x: number, y: number, z: number, size: number) {
    let v = false;

    v ||= y < 10;

    v ||=
      this.noise.noise2D(x / 32, z / 32) * this.noise.noise2D(x / 16, z / 16) > (y / (size / 2)) - 0.5

    v &&=
      x > 2 && x < size - 2 && y > 2 && y < size - 2 && z > 2 && z < size - 2;

    return v;
  }

  sample(x: number, y: number, z: number, size: number) {
    let v = false;

    //         v ||=
    // noise.noise3D(x / 4, y / 4, z / 4) >=
    // 0.8;

    // v ||=
    //   noise.noise3D(x / 8, y / 8, z / 8) +
    //   noise.noise3D(x / 16, y / 16, z / 16) >=
    //   0.5;

    //           v ||=
    //           noise.noise3D(x / 16, y / 16, z / 16) +
    // noise.noise3D(x / 32, y / 32, z / 32) >=
    // 0.5;

    // v ||= x === this.size / 2 && y === this.size / 2 && z === this.size / 2;

    //const sphereRadius = 10;
    //const sphereVector3 = { x: (this.size - 2) - sphereRadius, y: (this.size - 2) - sphereRadius, z: (this.size - 2) - sphereRadius };
    //const sphereVector3 = { x: 0, y: 0, z: 0 };

    const sphereRadius = 20;
    const sphereVector3 = { x: size / 2, y: size / 2, z: size / 2 };

    // v ||=
    //   Math.sqrt(
    //     (x - sphereVector3.x) * (x - sphereVector3.x) +
    //     (y - sphereVector3.y) * (y - sphereVector3.y) +
    //     + (z - sphereVector3.z) * (z - sphereVector3.z)
    //   ) < sphereRadius

    v ||=
      Math.sqrt(
        (x - sphereVector3.x) * (x - sphereVector3.x) +
        (y - sphereVector3.y) * (y - sphereVector3.y) +
        +(z - sphereVector3.z) * (z - sphereVector3.z)
      ) < sphereRadius &&
      !(
        this.noise.noise3D(x / 32, y / 32, z / 32) +
        this.noise.noise3D(x / 16, y / 16, z / 16) >=
        0.5
      );

    if (
      Math.sqrt(
        (x - sphereVector3.x) * (x - sphereVector3.x) +
        (y - sphereVector3.y) * (y - sphereVector3.y) +
        +(z - sphereVector3.z) * (z - sphereVector3.z)
      ) <
      sphereRadius - 5
    ) {
      v = false;
    }

    v ||= this.random() <= 0.005;

    //v ||= this.random() <= 0.01;
    v ||= x === 3 && z === 3;
    v ||= x === 3 && y === 3;
    v ||= z === 3 && y === 3;

    v ||= x === size / 2 && z === size / 2;
    v ||= x === size / 2 && y === size / 2;
    v ||= z === size / 2 && y === size / 2;

    //v ||= x==10;
    //v ||= x === 10 && y === 10 && z === 10;

    const cubeRadius = 10;
    const cubeVector3 = {
      x: size - 2 - cubeRadius,
      y: 2 + cubeRadius,
      z: size - 2 - cubeRadius,
    };

    // v ||=
    //   x > (cubeVector3.x - cubeRadius) &&
    //   x < (cubeVector3.x + cubeRadius) &&
    //   y > (cubeVector3.y - cubeRadius) &&
    //   y < (cubeVector3.y + cubeRadius) &&
    //   z > (cubeVector3.z - cubeRadius) &&
    //   z < (cubeVector3.z + cubeRadius)

    // v||= sdRoundBox(vec3(x, y, z), vec3(this.size/2, this.size/2, this.size/2), 10) < 0;

    v &&=
      x > 2 && x < size - 2 && y > 2 && y < size - 2 && z > 2 && z < size - 2;

    return v;
  }

  sample2(x: number, y: number, z: number) {
    let v = false;

    const sphereRadius = 10;
    const sphereVector3 = { x: 0, y: 0, z: 0 };

    v ||=
      Math.sqrt(
        (x - sphereVector3.x) * (x - sphereVector3.x) +
        (y - sphereVector3.y) * (y - sphereVector3.y) +
        +(z - sphereVector3.z) * (z - sphereVector3.z)
      ) < sphereRadius;

    v ||= x === 6 && y === 6 && z === 6;

    return v;
  }
}
