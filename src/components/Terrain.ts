import { Scene } from "@babylonjs/core/scene";
import { mkSimplexNoise } from "../perlin";
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

interface Point {
  position: Position;
  links: Point[];
  quad?: Quad;
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

function eqn(a: number, b: number) {
  return Math.abs(a - b) < 0.00001;
}

function distance(a: Position, b: Position) {
  return Math.sqrt((a.x - b.x)*(a.x - b.x) + (a.y - b.y)*(a.y - b.y) + (a.z - b.z)*(a.z - b.z));
}


export class Terrain {
  scene: Scene;
  size: number;
  data: Block[][][];
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
    this.data = [];
    this.triangles = [];
    this.meshLines = [];
    this.ownerLines = [];
    this.debugLines = [];

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

    const debug = false;

    this.generate();
    this.computeEdges();
    debug && this.drawCorners();
    //debug && this.drawEdges();

    this.computeLines();
    //debug && this.drawOwnerLines();
    debug && this.drawDebugLines();
    debug && this.drawMeshLines();
    this.drawTriangles();

    this.cubeMesh.position.set(100, 100, 100);
  }

  getPoint(x: number, y: number, z: number): Point {
    const voxel = this.data[Math.floor(x)][Math.floor(y)][Math.floor(z)];

    if (!voxel) {
      console.log(x, y, z);
    }

    for (const point of voxel.points) {
      const position = point.position;

      if (eqn(x, position.x) && eqn(y, position.y) && eqn(y, position.y)) {
        return point;
      }
    }

    const point = { position: { x, y, z }, links: [] };

    voxel.points.push(point);

    return point;
  }

  generate() {
    const noise = mkSimplexNoise(Math.random);

    for (let x = 0; x < this.size; x++) {
      const rowx: Block[][] = [];

      for (let y = 0; y < this.size; y++) {
        const rowy: Block[] = [];

        for (let z = 0; z < this.size; z++) {
          let v = false;

                  v ||=
          noise.noise3D(x / 4, y / 4, z / 4) >=
          0.8;

          // v ||=
          //   noise.noise3D(x / 8, y / 8, z / 8) +
          //   noise.noise3D(x / 16, y / 16, z / 16) >=
          //   0.5;

                      v ||=
                      noise.noise3D(x / 16, y / 16, z / 16) +
            noise.noise3D(x / 32, y / 32, z / 32) >=
            0.5;

          // v ||= x == this.size / 2 && y == this.size / 2 && z == this.size / 2;

          const sphereRadius = 10;
          const spherePosition = { x: (this.size - 2) - sphereRadius, y: (this.size - 2) - sphereRadius, z: (this.size - 2) - sphereRadius };
          //const spherePosition = { x: 0, y: 0, z: 0 };

          v ||=
            Math.sqrt(
              (x - spherePosition.x) * (x - spherePosition.x) +
              (y - spherePosition.y) * (y - spherePosition.y) +
              + (z - spherePosition.z) * (z - spherePosition.z)
            ) < sphereRadius

          v ||=
            Math.sqrt(
              (x - spherePosition.x) * (x - spherePosition.x) +
              (y - spherePosition.y) * (y - spherePosition.y) +
              + (z - spherePosition.z) * (z - spherePosition.z)
            ) < sphereRadius && !(noise.noise3D(x / 32, y / 32, z / 32) + noise.noise3D(x / 16, y / 16, z / 16) >= 0.5);

          v ||= Math.random() <= 0.01;
          v ||= (x == 3) && z === 3;
          v ||= (x == 3) && y === 3;
          v ||= (z == 3) && y === 3;

          v ||= (x == this.size / 2) && z === this.size / 2;
          v ||= (x == this.size / 2) && y === this.size / 2;
          v ||= (z == this.size / 2) && y === this.size / 2;

          //v ||= x==10;
          //v ||= x == 10 && y == 10 && z == 10;

          const cubeRadius = 10;
          const cubePosition = { x: (this.size - 2) - cubeRadius, y: 2 + cubeRadius, z: (this.size - 2) - cubeRadius };

          v ||=
            x > (cubePosition.x - cubeRadius) &&
            x < (cubePosition.x + cubeRadius) &&
            y > (cubePosition.y - cubeRadius) &&
            y < (cubePosition.y + cubeRadius) &&
            z > (cubePosition.z - cubeRadius) &&
            z < (cubePosition.z + cubeRadius)

          // v||= sdRoundBox(vec3(x, y, z), vec3(this.size/2, this.size/2, this.size/2), 10) < 0;

          v &&= x > 2 && x < this.size - 2 && y > 2 && y < this.size - 2 && z > 2 && z < this.size - 2

          rowy.push({
            v: v ? "solid" : "gaz",
            edges: [null, null, null, null, null, null, null, null],
            edgesConfigs: [null, null, null, null, null, null, null, null],
            points: [],
          });
        }

        rowx.push(rowy);
      }

      this.data.push(rowx);
    }
  }

  computeEdges() {
    for (let x = 1; x < this.size - 1; x++) {
      for (let y = 1; y < this.size - 1; y++) {
        for (let z = 1; z < this.size - 1; z++) {
          const aTopLeft = this.data[x][y][z];
          const aTopRight = this.data[x + 1][y][z];
          const bTopLeft = this.data[x][y][z + 1];
          const bTopRight = this.data[x + 1][y][z + 1];

          const aBottomLeft = this.data[x][y + 1][z];
          const aBottomRight = this.data[x + 1][y + 1][z];
          const bBottomLeft = this.data[x][y + 1][z + 1];
          const bBottomRight = this.data[x + 1][y + 1][z + 1];

          const config = [
            aTopLeft.v,
            aTopRight.v,
            bTopLeft.v,
            bTopRight.v,
            aBottomLeft.v,
            aBottomRight.v,
            bBottomLeft.v,
            bBottomRight.v,
          ]
            .map((v) => (v === "solid" ? "1" : "0"))
            .join("");

          const configIndex = configIndexToStr.findIndex((v) => v === config);

          if (configIndex >= 0) {
            const configuration = configIndexToEdgePositions?.[configIndex];

            for (let i = 0; i < 8; i++) {
              const cornerPos = cornerIndexToPosition[i];

              const corner =
                this.data[x + cornerPos.x][y + cornerPos.y][z + cornerPos.z];

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
        }
      }
    }
  }

  makeQuad(p1: Point, p2: Point, p3: Point, p4: Point) {
    const quad: Quad = {points: [p1, p2, p3, p4]};

    p1.quad = quad;
    p2.quad = quad;
    p4.quad = quad;
    p4.quad = quad;

    const d1 = distance(p1.position, p3.position);
    const d2 = distance(p2.position, p4.position);

    if (d1 < d2) {
      this.triangles.push([p1.position, p2.position, p3.position], [p3.position, p4.position, p1.position])
    } else if (d2 < d1) {
      this.triangles.push([p2.position, p3.position, p4.position], [p4.position, p1.position, p2.position])
    } else {
      this.triangles.push([p1.position, p2.position, p4.position], [p2.position, p3.position, p4.position]);
    }
  }

  linkEdge(edge1: Point, edge2: Point) {
    const p1 = this.getPoint(edge1.position.x, edge1.position.y, edge1.position.z);
    const p2 = this.getPoint(edge2.position.x, edge2.position.y, edge2.position.z);

    if (!p1.links.includes(p2)) {
      p1.links.push(p2);
      p2.links.push(p1);

      // search for quad

      for (const p1l of p1.links) {
        for (const p2l of p2.links) {
          if (p1l !== p2 && p2l !== p1 && p1l.links.includes(p2l)) {
            this.makeQuad(p1, p2, p2l, p1l);
          }
        }
      }

      this.meshLines.push([p1.position, p2.position]);
    }
  }

  computeLines() {
    for (let x = 1; x < this.size - 1; x++) {
      for (let y = 1; y < this.size - 1; y++) {
        for (let z = 1; z < this.size - 1; z++) {
          const cornerData = this.data[x][y][z];

          // if (!(x % 10 === 0 && y % 10 === 0 && z % 10 === 0)) {
          //   continue;
          // }

          if (cornerData.edgesConfigs.some(c => c !== "00000000" && c !== "11111111" && c !== null)) {

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
                            cornerIndexToPosition[selfAxisCornerIndex][
                            otherAxis
                            ] !== cornerIndexToPosition[i][otherAxis] &&
                            cornerIndexToPosition[selfAxisCornerIndex][
                            lastAxis
                            ] === cornerIndexToPosition[i][lastAxis]
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
                                cornerIndexToPosition[selfAxisCornerIndex][
                                otherAxis
                                ] === cornerIndexToPosition[i][otherAxis] &&
                                cornerIndexToPosition[selfAxisCornerIndex][
                                lastAxis
                                ] !== cornerIndexToPosition[i][lastAxis]
                            )!;

                          if (farOpposedCornerIndex === undefined) {
                            throw new Error("tf2");
                          }

                          const farOpposedCornerData =
                            this.data[x + (axis === "x" ? sign : 0)][
                            y + (axis === "y" ? sign : 0)
                            ][z + (axis === "z" ? sign : 0)];


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
          const corner = this.data[x][y][z];

          if (corner.edgesConfigs.some(c => c !== "00000000" && c !== "11111111" && c !== null)) {
            if (this.data[x][y][z].v === "solid") {
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
            const cornerData = this.data[x][y][z];

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

    customMesh.color = Color3.Yellow();
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

  drawTriangles() {
    console.log("draw triangles");

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
    mat.diffuseColor = Color3.Yellow();
    //mat.wireframe = true;
    customMesh.material = mat;
  }
}
