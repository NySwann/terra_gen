import { Scene } from "@babylonjs/core/scene";
import { mkSimplexNoise, SimplexNoise } from "../perlin";
import {
  Color3,
  Color4,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexData,
} from "@babylonjs/core";

import {
  configIndexToEdgePositions,
  configIndexToStr,
  cornerIndexToEdgeIndex,
  cornerIndexToPosition,
} from "./Table";

interface Quad {
  points: [Point, Point, Point, Point];
}

interface Line {
  a: Point,
  b: Point,
  quads: Quad[];
}

interface Point {
  position: Position;
  lines: Line[];
}

interface Position {
  x: number;
  y: number;
  z: number;
}

type Material = "gaz" | "solid";

interface Block {
  v: Material;
  edges: [
    Point | null,
    Point | null,
    Point | null,
    Point | null,
    Point | null,
    Point | null,
    Point | null,
    Point | null
  ];
  edgesConfigs: [
    string | null,
    string | null,
    string | null,
    string | null,
    string | null,
    string | null,
    string | null,
    string | null
  ];
  points: Point[]
}

function is_line(l: Line, p1: Point, p2: Point) {
  return (l.a === p1 && l.b === p2) || (l.a === p2 && l.b === p1);
}

function eqn(a: number, b: number) {
  return Math.abs(a - b) < 0.00001;
}

function distance(a: Position, b: Position) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z));
}

function middle(a: Position, b: Position) {
  return {x : (a.x + b.x) / 2, y : (a.y + b.y) / 2, z : (a.z + b.z) / 2}
}

function sfc32(a, b, c, d) {
  return function() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

const lines = true;
const debug = false;

export class Terrain {
  noise: SimplexNoise;
  scene: Scene;
  size: number;
  data: Block[];
  cubeMesh: Mesh;
  transparentSphereMesh: Mesh;
  triangles: [Position, Position, Position][];
  meshLines: [Position, Position][];
  ownerLines: [Position, Position][];
  debugLines: [Position, Position][];
  root: TransformNode;

  constructor(scene: Scene) {
    this.scene = scene;

    this.size = 50;
    this.data = new Array(this.size * this.size * this.size).fill(null).map(()=> ({
      v: "gaz",
      edges: [null, null, null, null, null, null, null, null],
      edgesConfigs: [null, null, null, null, null, null, null, null],
      points: [],
    }));
    this.triangles = [];
    this.meshLines = [];
    this.ownerLines = [];
    this.debugLines = [];

    //const seed = [Math.floor(Math.random() * 100), Math.floor(Math.random() * 100), Math.floor(Math.random() * 100), Math.floor(Math.random() * 100)];
    const seed = [85, 44, 74, 6];
    console.log("seed", seed);
    const random = sfc32(seed[0], seed[1], seed[2], seed[3]);

    this.noise = mkSimplexNoise(random);

    this.root = new TransformNode("root", this.scene);

    this.root.position.set(-this.size / 2, -this.size / 2, -this.size / 2);

    this.cubeMesh = MeshBuilder.CreateBox(
      "sphere",
      { size: 0.25 },
      this.scene
    );
    this.cubeMesh.registerInstancedBuffer("color", 4);
    this.cubeMesh.instancedBuffers.color = new Color4(
      0.2,
      0.6,
      0.4,
      1.0
    );

    this.generate();
    this.compute();
    !debug && this.draw();

    lines && this.drawMeshLines();

    debug && this.drawCorners();
    //debug && this.drawEdges();
    //debug && this.drawOwnerLines();
    debug && this.drawDebugLines();

    this.cubeMesh.position.set(100, 100, 100);
  }

  getPoint(x: number, y: number, z: number): Point {
    const voxel = this.getData(Math.floor(x), Math.floor(y), Math.floor(z));

    if (!voxel) {
      console.log(x, y, z);
    }

    for (const point of voxel.points) {
      const position = point.position;

      if (eqn(x, position.x) && eqn(y, position.y) && eqn(y, position.y)) {
        return point;
      }
    }

    const point = { position: { x, y, z }, lines: [] };

    voxel.points.push(point);

    return point;
  }

  makeQuad(p1: Point, p2: Point, p3: Point, p4: Point) {
    if (new Set([p1, p2, p3, p4]).size !== 4) {
      return;
    } 

    const quad: Quad = { points: [p1, p2, p3, p4] };

    p1.lines.find(l => is_line(l, p1, p2))!.quads.push(quad);
    p2.lines.find(l => is_line(l, p2, p3))!.quads.push(quad);
    p3.lines.find(l => is_line(l, p3, p4))!.quads.push(quad);
    p4.lines.find(l => is_line(l, p4, p1))!.quads.push(quad);

    const d1 = distance(p1.position, p3.position);
    const d2 = distance(p2.position, p4.position);

    let triangles;

    if (d1 <= d2) {
      triangles = [[p1.position, p2.position, p3.position], [p3.position, p4.position, p1.position]];
    } else {
      triangles = [[p2.position, p3.position, p4.position], [p4.position, p1.position, p2.position]];
    }

    this.triangles.push(...triangles);

    // si le quad est pas du tout planar, on se rajoute une petite ligne pour que ca looks good

    if (debug) {
      return;
    }

    const a1 = {x: triangles[0][1].x - triangles[0][0].x, y: triangles[0][1].y - triangles[0][0].y, z: triangles[0][1].z - triangles[0][0].z }
    const b1 = {x: triangles[0][2].x - triangles[0][0].x, y: triangles[0][2].y - triangles[0][0].y, z: triangles[0][2].z - triangles[0][0].z }
    const n1 = { x: a1.y * b1.z - a1.z * b1.y, y: a1.z * b1.x - a1.x * b1.z, z: a1.x * b1.y - a1.y * b1.x};

    const a2 = {x: triangles[1][1].x - triangles[1][0].x, y: triangles[1][1].y - triangles[1][0].y, z: triangles[1][1].z - triangles[1][0].z }
    const b2 = {x: triangles[1][2].x - triangles[1][0].x, y: triangles[1][2].y - triangles[1][0].y, z: triangles[1][2].z - triangles[1][0].z }
    const n2 = { x: a2.y * b2.z - a2.z * b2.y, y: a2.z * b2.x - a2.x * b2.z, z: a2.x * b2.y - a2.y * b2.x};

    const diff = Vector3.Dot(new Vector3(n1.x, n1.y, n1.z).normalize(), new Vector3(n2.x, n2.y, n2.z).normalize());

    if (diff < 0.9)
    {
      this.meshLines.push([triangles[0][0], triangles[0][2]])
    }
  }

  linkEdge(edge1: Point, edge2: Point) {
    const p1 = this.getPoint(edge1.position.x, edge1.position.y, edge1.position.z);
    const p2 = this.getPoint(edge2.position.x, edge2.position.y, edge2.position.z);

    if (p1 === p2) {
      return;
    }

    if (!p1.lines.some(l => is_line(l, p1, p2))) {
      this.meshLines.push([p1.position, p2.position]);

      const line = { a: p1, b: p2, quads: [] }

      p1.lines.push(line);
      p2.lines.push(line);

      // search for quad

      for (const p1l of p1.lines) {
        const p1lp = p1l.a === p1 ? p1l.b : p1l.a;

        for (const p2l of p2.lines) {
          const p2lp = p2l.a === p2 ? p2l.b : p2l.a;

          if (p1lp !== p2 && p2lp !== p1 && p1lp.lines.some(l => is_line(l, p1lp, p2lp))) {

            this.makeQuad(p1, p2, p2lp, p1lp);
          }
        }
      };
    }
  }


  sample(x: number, y: number, z: number) {
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
    //const spherePosition = { x: (this.size - 2) - sphereRadius, y: (this.size - 2) - sphereRadius, z: (this.size - 2) - sphereRadius };
    //const spherePosition = { x: 0, y: 0, z: 0 };

    const sphereRadius = 20;
    const spherePosition = { x: this.size / 2, y: this.size / 2, z: this.size / 2 };

    // v ||=
    //   Math.sqrt(
    //     (x - spherePosition.x) * (x - spherePosition.x) +
    //     (y - spherePosition.y) * (y - spherePosition.y) +
    //     + (z - spherePosition.z) * (z - spherePosition.z)
    //   ) < sphereRadius

    v ||=
      Math.sqrt(
        (x - spherePosition.x) * (x - spherePosition.x) +
        (y - spherePosition.y) * (y - spherePosition.y) +
        + (z - spherePosition.z) * (z - spherePosition.z)
      ) < sphereRadius && !(this.noise.noise3D(x / 32, y / 32, z / 32) + this.noise.noise3D(x / 16, y / 16, z / 16) >= 0.5);

    if (
      Math.sqrt(
        (x - spherePosition.x) * (x - spherePosition.x) +
        (y - spherePosition.y) * (y - spherePosition.y) +
        + (z - spherePosition.z) * (z - spherePosition.z)
      ) < sphereRadius - 5) {
      v = false;
    }

    v ||= Math.random() <= 0.005;

    //v ||= Math.random() <= 0.01;
    // v ||= (x === 3) && z === 3;
    // v ||= (x === 3) && y === 3;
    // v ||= (z === 3) && y === 3;

    v ||= (x === this.size / 2) && z === this.size / 2;
    v ||= (x === this.size / 2) && y === this.size / 2;
    v ||= (z === this.size / 2) && y === this.size / 2;

    //v ||= x==10;
    //v ||= x === 10 && y === 10 && z === 10;

    const cubeRadius = 10;
    const cubePosition = { x: (this.size - 2) - cubeRadius, y: 2 + cubeRadius, z: (this.size - 2) - cubeRadius };

    // v ||=
    //   x > (cubePosition.x - cubeRadius) &&
    //   x < (cubePosition.x + cubeRadius) &&
    //   y > (cubePosition.y - cubeRadius) &&
    //   y < (cubePosition.y + cubeRadius) &&
    //   z > (cubePosition.z - cubeRadius) &&
    //   z < (cubePosition.z + cubeRadius)

    // v||= sdRoundBox(vec3(x, y, z), vec3(this.size/2, this.size/2, this.size/2), 10) < 0;

    v &&= x > 2 && x < this.size - 2 && y > 2 && y < this.size - 2 && z > 2 && z < this.size - 2

    return v;
  }

  setDataType(x: number, y: number, z: number, v: "solid" | "gaz")
  {
    return this.data[x * (this.size * this.size) + y * (this.size) + z].v = v;
  }

  getData(x: number, y: number, z: number)
  {
    return this.data[x * (this.size * this.size) + y * (this.size) + z];
  }

  generate() {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          this.setDataType(x, y, z, this.sample(x, y, z) ? "solid" : "gaz");
        }
      }
    }
  }

  compute() {
    for (let x = 0; x < this.size - 1; x++) {
      for (let y = 0; y < this.size - 1; y++) {
        for (let z = 0; z < this.size - 1; z++) {
          const config = [
            this.getData(x, y, z),
            this.getData(x + 1, y, z),
            this.getData(x, y, z + 1),
            this.getData(x + 1, y, z + 1),
            this.getData(x, y + 1, z),
            this.getData(x + 1, y + 1, z),
            this.getData(x, y + 1, z + 1),
            this.getData(x + 1, y + 1, z + 1),
          ]
            .map((d) => (d.v === "solid" ? "1" : "0"))
            .join("");

          const configIndex = configIndexToStr.findIndex((v) => v === config);

          if (configIndex >= 0) {
            const configuration = configIndexToEdgePositions?.[configIndex];

            for (let i = 0; i < 8; i++) {
              const cornerPos = cornerIndexToPosition[i];

              const corner =
                this.getData(x + cornerPos.x, y + cornerPos.y, z + cornerPos.z);

              corner.edgesConfigs[cornerIndexToEdgeIndex[i]] = config;

              const edge = configuration?.[i];

              if (edge) {
                const px = x + 0.5 + edge.x;
                const py = y + 0.5 + edge.y;
                const pz = z + 0.5 + edge.z;

                const point = this.getPoint(px, py, pz);

                corner.edges[cornerIndexToEdgeIndex[i]] = point;
              }
            }
          }

          if (x > 1 && y > 1 && z > 1) {

          const cornerData = this.getData(x, y, z);

          if (!cornerData.edgesConfigs.some(c => c !== "00000000" && c !== "11111111" && c !== null)) {
            continue;
          }

          [1, -1].forEach((sign) => {
            ["x", "y", "z"].forEach((axis) => {
              const selfAxisCornerIndexes = cornerIndexToPosition
                .map((c, i) => (c[axis] === (sign === -1 ? 1 : 0) ? i : -1)) // -1 c'est 1 car  [0    1]X[0    1]  
                .filter((i) => i >= 0);

              if (selfAxisCornerIndexes.length !== 4) {
                throw new Error();
              }

              const revertedSelfAxisCornerIndexes = cornerIndexToPosition
                .map((c, i) => (c[axis] === (sign === -1 ? 0 : 1) ? i : -1)) // -1 c'est 1 car  [0    1]X[0    1]  
                .filter((i) => i >= 0);

              if (revertedSelfAxisCornerIndexes.length !== 4) {
                throw new Error();
              }

              for (const selfAxisCornerIndex of selfAxisCornerIndexes) {
                const selfEdge =
                  cornerData.edges[cornerIndexToEdgeIndex[selfAxisCornerIndex]];

                if (selfEdge) {

                  this.ownerLines.push([
                    { x, y, z },
                    {
                      x: selfEdge.position.x,
                      y: selfEdge.position.y,
                      z: selfEdge.position.z,
                    }
                  ]);

                  ["x", "y", "z"]
                    .filter((a) => axis !== a)
                    .map((otherAxis) => {
                      const lastAxis = ["x", "y", "z"].find(
                        (a) => a !== axis && a !== otherAxis
                      );

                      if (lastAxis === undefined) {
                        throw new Error("tf1");
                      }

                      const otherCornerIndex = selfAxisCornerIndexes.find(
                        (i) =>
                          cornerIndexToPosition[selfAxisCornerIndex][otherAxis] !== cornerIndexToPosition[i][otherAxis] &&
                          cornerIndexToPosition[selfAxisCornerIndex][lastAxis] === cornerIndexToPosition[i][lastAxis]
                      )!;

                      if (otherCornerIndex === undefined) {
                        throw new Error("tf2");
                      }

                      const otherEdge =
                        cornerData.edges[
                        cornerIndexToEdgeIndex[otherCornerIndex]
                        ];

                      if (otherEdge) {
                        this.linkEdge(selfEdge, otherEdge);
                      }

                      {
                        const farOpposedCornerIndex =
                          revertedSelfAxisCornerIndexes.find(
                            (i) =>
                              cornerIndexToPosition[selfAxisCornerIndex][otherAxis] === cornerIndexToPosition[i][otherAxis] &&
                              cornerIndexToPosition[selfAxisCornerIndex][lastAxis] !== cornerIndexToPosition[i][lastAxis]
                          )!;

                        if (farOpposedCornerIndex === undefined) {
                          throw new Error("tf2");
                        }

                        const farOpposedCornerData =
                          this.getData(x + (axis === "x" ? sign : 0), 
                          y + (axis === "y" ? sign : 0)
                          , z + (axis === "z" ? sign : 0));

                        const farOpposedEdge =
                          farOpposedCornerData.edges[
                          cornerIndexToEdgeIndex[farOpposedCornerIndex]
                          ];

                        if (farOpposedEdge) {
                          this.linkEdge(selfEdge, farOpposedEdge);
                        }
                      }
                    });
                }
              }
            });
          });
        
          }
        }
      }
    }
  }

  drawCorners() {
    for (let x = 0; x < this.size - 1; x++) {
      for (let y = 0; y < this.size - 1; y++) {
        for (let z = 0; z < this.size - 1; z++) {
          const corner = this.getData(x, y, z);

          if (corner.edgesConfigs.some(c => c !== "00000000" && c !== "11111111" && c !== null)) {
            if (corner.v === "solid") {
              const mesh = this.cubeMesh.createInstance(`lol`);

              mesh.parent = this.root;

              mesh.position.x = x;
              mesh.position.y = y;
              mesh.position.z = z;
              mesh.freezeWorldMatrix();

              mesh.instancedBuffers.color = new Color4(1, 0, 0, 1)
            } else {
              // const mesh = this.cubeMesh.createInstance(`lol`);

              // mesh.parent = this.root;

              // mesh.position.x = x;
              // mesh.position.y = y;
              // mesh.position.z = z;
              // mesh.freezeWorldMatrix();

              // mesh.instancedBuffers.color = new Color4(0, 0, 1, 0);
            }
          }
        }
      }
    }
  }

  drawEdges() {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          for (let i = 0; i < 8; i++) {
            const cornerData = this.getData(x, y, z);

            for (const point of cornerData.points) {
              const mesh = this.cubeMesh.createInstance(`lol`);

              mesh.parent = this.root;

              mesh.position.x = point.position.x;
              mesh.position.y = point.position.y;
              mesh.position.z = point.position.z;
              mesh.freezeWorldMatrix();

              mesh.instancedBuffers.color = new Color4(1, 1, 1, 1);
            }
          }
        }
      }
    }
  }


  drawMeshLines() {

    const customMesh = MeshBuilder.CreateLineSystem(
      "lineSystem",
      {
        lines: this.meshLines.map((l) =>
          l.map((li) => new Vector3(li.x, li.y, li.z))
        ),
      },
      this.scene
    );

    customMesh.parent = this.root;
    customMesh.color = new Color3(0, 0.9, 1).scale(0.8);

    const i2 = customMesh.createInstance('l');
    i2.position.set(0.01, 0, 0);
    i2.parent = this.root;

    const i3 = customMesh.createInstance('l');
    i3.position.set(0, 0.01, 0);
    i3.parent = this.root;

    const i4 = customMesh.createInstance('l');
    i4.position.set(0, 0, 0.01);
    i4.parent = this.root;
  }

  drawOwnerLines() {
    const customMesh = MeshBuilder.CreateLineSystem(
      "lineSystem",
      {
        lines: this.ownerLines.map((l) =>
          l.map((li) => new Vector3(li.x, li.y, li.z))
        ),

      },
      this.scene
    );

    customMesh.parent = this.root;

    customMesh.color = Color3.Black();
  }

  drawDebugLines() {
    const customMesh = MeshBuilder.CreateLineSystem(
      "lineSystem",
      {
        lines: this.debugLines.map((l) =>
          l.map((li) => new Vector3(li.x, li.y, li.z))
        ),
      },
      this.scene
    );

    customMesh.parent = this.root;

    customMesh.color = Color3.White();
  }

  draw() {
    const customMesh = new Mesh("custom", this.scene);

    customMesh.parent = this.root;

    //customMesh.position.set(5, 5, 5);

    const positions: number[] = [];
    const indices: number[] = [];

    this.triangles.forEach((t, i) => {
      positions.push(t[0].x, t[0].y, t[0].z);
      indices.push(indices.length);
      positions.push(t[1].x, t[1].y, t[1].z);
      indices.push(indices.length);
      positions.push(t[2].x, t[2].y, t[2].z);
      indices.push(indices.length);
    });

    const vertexData = new VertexData();

    //Empty array to contain calculated values or normals added
    // var normals = [];

    // //Calculations of normals added
    // VertexData.ComputeNormals(positions, indices, normals, {
    // subDiv: [8, 8, 8]
    // })

    vertexData.positions = positions;
    vertexData.indices = indices;
    //vertexData.normals = normals;

    vertexData.applyToMesh(customMesh);

    const mat = new StandardMaterial("mat", this.scene);
    mat.backFaceCulling = false;
    mat.diffuseColor = Color3.Black();
    //mat.wireframe = true;
    customMesh.material = mat;
  }
}
