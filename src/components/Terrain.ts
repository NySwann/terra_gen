import { Scene } from "@babylonjs/core/scene";
import { mkSimplexNoise } from "../perlin";
import {
  Color3,
  Color4,
  Mesh,
  MeshBuilder,
  TransformNode,
  Vector3,
} from "@babylonjs/core";

import {
  configIndexToEdgePositions,
  configIndexToStr,
  cornerIndexToEdgeIndex,
  cornerIndexToPosition,
} from "./Table";

interface Position {
  x: number;
  y: number;
  z: number;
}

type Material = "gaz" | "solid";

interface Block {
  v: Material;
  edges: [
    Position | null,
    Position | null,
    Position | null,
    Position | null,
    Position | null,
    Position | null,
    Position | null,
    Position | null
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
}

function eq(a: Position, b: Position) {
  return Math.abs(a.x - b.x) < 0.00001 && Math.abs(a.y - b.y) < 0.00001 && Math.abs(a.z - b.z) < 0.00001;
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

    this.size = 24;
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
    this.drawMeshLines();

    this.cubeMesh.position.set(100, 100, 100);
    this.transparentSphereMesh.position.set(100, 100, 100);
  }

  generate() {
    const noise = mkSimplexNoise(Math.random);

    for (let x = 0; x < this.size; x++) {
      const rowx: Block[][] = [];

      for (let y = 0; y < this.size; y++) {
        const rowy: Block[] = [];

        for (let z = 0; z < this.size; z++) {
          let v = false;

          //         v ||=
          // noise.noise3D(x / 8, y / 8, z / 8) >=
          // 0.5;

          v ||=
          noise.noise3D(x / 8, y / 8, z / 8)+
            noise.noise3D(x / 16, y / 16, z / 16) >=
            0.5;

          // v ||= x == this.size / 2 && y == this.size / 2 && z == this.size / 2;

          const sphereRadius = 4;
          const spherePosition = { x: (this.size - 2) - sphereRadius, y: (this.size - 2)- sphereRadius, z: (this.size - 2) - sphereRadius};
          //const spherePosition = { x: 0, y: 0, z: 0 };

          v ||=
            Math.sqrt(
              (x - spherePosition.x) * (x - spherePosition.x) +
              (y - spherePosition.y) * (y - spherePosition.y) +
              + (z - spherePosition.z) * (z - spherePosition.z)
            ) < sphereRadius

          // v ||=
          //   Math.sqrt(
          //     (x - spherePosition.x) * (x - spherePosition.x) +
          //     (y - spherePosition.y) * (y - spherePosition.y) +
          //     + (z - spherePosition.z) * (z - spherePosition.z)
          //   ) < sphereRadius && !(noise.noise3D(x / 32, y / 32, z / 32) + noise.noise3D(x / 16, y / 16, z / 16) >= 0.5);

          v ||= Math.random() <= 0.01;
          v ||= (x == 3) && z === 3;
          v ||= (x == 3) && y === 3;
          v ||= (z == 3) && y === 3;
          //v ||= x == 10 && y == 10 && z == 10;

          const cubeRadius = 4;
          const cubePosition = { x: (this.size - 2) - cubeRadius, y: 2 + cubeRadius , z: (this.size - 2) - cubeRadius};

          v ||=
            x > (cubePosition.x - cubeRadius) &&
            x < (cubePosition.x + cubeRadius) &&
            y > (cubePosition.y - cubeRadius) &&
            y < (cubePosition.y + cubeRadius) &&
            z > (cubePosition.z - cubeRadius) &&
            z < (cubePosition.z + cubeRadius)

          // v||= sdRoundBox(vec3(x, y, z), vec3(this.size/2, this.size/2, this.size/2), 10) < 0;

          rowy.push({
            v: v ? "solid" : "gaz",
            edges: [null, null, null, null, null, null, null, null],
            edgesConfigs: [null, null, null, null, null, null, null, null],
          });
        }

        rowx.push(rowy);
      }

      this.data.push(rowx);
    }
  }

  computeEdges() {
    for (let x = 0; x < this.size - 1; x++) {
      for (let y = 0; y < this.size - 1; y++) {
        for (let z = 0; z < this.size - 1; z++) {
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
                corner.edges[cornerIndexToEdgeIndex[i]] = {
                  x: edge.x,
                  y: edge.y,
                  z: edge.z,
                };
              }
            }
          }
        }
      }
    }
  }

  pushLine(line: [Position, Position]) {
    const already = this.meshLines.some(l => (eq(l[0], line[0]) && eq(l[1], line[1])) || (eq(l[1], line[0]) && eq(l[0], line[1])));

    if (already) {
      return;
    }

    this.meshLines.push(line);
  }

  computeLines() {
    for (let x = 1; x < this.size - 1; x++) {
      for (let y = 1; y < this.size - 1; y++) {
        for (let z = 1; z < this.size - 1; z++) {
          const cornerData = this.data[x][y][z];

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
                  const selfCorner = cornerIndexToPosition[selfAxisCornerIndex];
                  const selfEdge =
                    cornerData.edges[cornerIndexToEdgeIndex[selfAxisCornerIndex]];

                  if (selfEdge) {

                    this.ownerLines.push([
                      { x, y, z },
                      {
                        x: x + (0.5 - selfCorner.x) + selfEdge.x,
                        y: y + (0.5 - selfCorner.y) + selfEdge.y,
                        z: z + (0.5 - selfCorner.z) + selfEdge.z,
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

                        const otherCorner =
                          cornerIndexToPosition[otherCornerIndex];
                        const otherEdge =
                          cornerData.edges[
                          cornerIndexToEdgeIndex[otherCornerIndex]
                        ];

                        if (otherEdge) {
                          const cornerTriangles: [Position, Position] = [
                            {
                              x: x + (0.5 - selfCorner.x) + selfEdge.x,
                              y: y + (0.5 - selfCorner.y) + selfEdge.y,
                              z: z + (0.5 - selfCorner.z) + selfEdge.z,
                            },
                            {
                              x: x + (0.5 - otherCorner.x) + otherEdge.x,
                              y: y + (0.5 - otherCorner.y) + otherEdge.y,
                              z: z + (0.5 - otherCorner.z) + otherEdge.z,
                            }
                          ];
                          this.pushLine(cornerTriangles);
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

                          const farOpposedCorner =
                            cornerIndexToPosition[farOpposedCornerIndex];
                          const farOpposedEdge =
                            farOpposedCornerData.edges[
                            cornerIndexToEdgeIndex[farOpposedCornerIndex]
                            ];

                          if (farOpposedEdge) {
                            const cornerTriangles: [Position, Position] = [
                              {
                                x: x + (0.5 - selfCorner.x) + selfEdge.x,
                                y: y + (0.5 - selfCorner.y) + selfEdge.y,
                                z: z + (0.5 - selfCorner.z) + selfEdge.z,
                              },
                              {
                                x:
                                  x +
                                  (axis === "x" ? sign : 0) +
                                  (0.5 - farOpposedCorner.x) +
                                  farOpposedEdge.x,
                                y:
                                  y +
                                  (axis === "y" ? sign : 0) +
                                  (0.5 - farOpposedCorner.y) +
                                  farOpposedEdge.y,
                                z:
                                  z +
                                  (axis === "z" ? sign : 0) +
                                  (0.5 - farOpposedCorner.z) +
                                  farOpposedEdge.z,
                              }
                            ];
                            this.pushLine(cornerTriangles);
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
            const cornerPos = cornerIndexToPosition[i];
            const cornerData = this.data[x][y][z];
            const edgePos = cornerData.edges[cornerIndexToEdgeIndex[i]];

            if (edgePos) {
              const mesh = this.cubeMesh.createInstance(`lol`);

              mesh.parent = this.root;

              mesh.position.x = x + (0.5 - cornerPos.x) + edgePos.x;
              mesh.position.y = y + (0.5 - cornerPos.y) + edgePos.y;
              mesh.position.z = z + (0.5 - cornerPos.z) + edgePos.z;
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
}
