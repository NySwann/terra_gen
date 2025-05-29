import { Scene } from "@babylonjs/core/scene";
import { mkSimplexNoise } from "../perlin";
import {
  Color3,
  Color4,
  Mesh,
  MeshBuilder,
  NodeMaterial,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexData,
} from "@babylonjs/core";
import { SimpleMaterial } from "@babylonjs/materials";
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
}

export class Terrain {
  scene: Scene;
  size: number;
  data: Block[][][];
  opaqueSphereMesh: Mesh;
  transparentSphereMesh: Mesh;
  triangles: [Position, Position, Position][];
  lines: Position[][];
  root: TransformNode;

  constructor(scene: Scene) {
    this.scene = scene;

    this.size = 30;
    this.data = [];
    this.triangles = [];
    this.lines = [];

    this.root = new TransformNode("root", this.scene);

    this.root.position.set(-this.size / 2, -this.size / 2, -this.size / 2);

    // MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, this.scene);

    this.opaqueSphereMesh = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 0.2, segments: 1 },
      this.scene
    );
    this.opaqueSphereMesh.registerInstancedBuffer("color", 4);
    this.opaqueSphereMesh.instancedBuffers.color = new Color4(
      0.2,
      0.6,
      0.4,
      1.0
    );

    this.transparentSphereMesh = MeshBuilder.CreateBox(
      "sphere",
      { size: 0.2 },
      this.scene
    );
    this.transparentSphereMesh.hasVertexAlpha = true;
    this.transparentSphereMesh.registerInstancedBuffer("color", 4);
    this.transparentSphereMesh.instancedBuffers.color = new Color4(
      0.2,
      0.6,
      0.4,
      1.0
    );

    this.generate();
    this.computeEdges();
    this.drawCorners();
    this.drawEdges();

    this.computeLines();
    this.drawLines();

    // this.computeTriangles();
    // this.drawTriangles();
  }

  generate() {
    const noise = mkSimplexNoise(Math.random);

    for (let x = 0; x < this.size; x++) {
      const rowx: Block[][] = [];

      for (let y = 0; y < this.size; y++) {
        const rowy: Block[] = [];

        for (let z = 0; z < this.size; z++) {
          const v =
            noise.noise3D(x / 16, y / 16, z / 16) +
              noise.noise3D(x / 32, y / 32, z / 32) >=
            0.5
              ? "solid"
              : "gaz";

          // const v =
          //   Math.sqrt(
          //     (x - 15.0) * (x - 15.0) +
          //       (y - 15.0) * (y - 15.0) +
          //       +(z - 15.0) * (z - 15.0)
          //   ) < 10
          //     ? "solid"
          //     : "gaz";
          // const v = Math.random() <= 0.3 ? "solid" : "gaz";
          //const v = (x ==10) ? "solid" : "gaz";
          //const v = x == 10 && y == 10 && z == 10 ? "solid" : "gaz";

          // const v =
          //   x > this.size / 2 - 5 &&
          //   x < this.size / 2 + 5 &&
          //   y > this.size / 2 - 5 &&
          //   y < this.size / 2 + 5 &&
          //   z > this.size / 2 - 5 &&
          //   z < this.size / 2 + 5
          //     ? "solid"
          //     : "gaz";

          rowy.push({
            v: v,
            edges: [null, null, null, null, null, null, null, null],
          });
        }

        rowx.push(rowy);
      }

      this.data.push(rowx);
    }
  }

  computeEdges() {
    console.log("computeEdges");
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

          if (config !== "00000000") {
            // console.log({x, y, z});
            // console.log(config);
            //console.log(configIndexToStr);
          }
          const configIndex = configIndexToStr.findIndex((v) => v === config);

          if (configIndex >= 0) {
            const configuration = configIndexToEdgePositions?.[configIndex];
            // console.log("found");
            // console.log(configIndexToEdgePositions[configIndex]);

            for (let i = 0; i < 8; i++) {
              const cornerPos = cornerIndexToPosition[i];

              // console.log(cornerPos);

              const corner =
                this.data[x + cornerPos.x][y + cornerPos.y][z + cornerPos.z];

              if (corner.v === "solid" || corner.v === "gaz") {
                //console.log(i);

                const edge = configuration?.[i];

                if (edge) {
                  // const mesh = this.opaqueSphereMesh.createInstance(`lol`)

                  // mesh.parent = this.root;

                  // mesh.position.x = x + 0.5 + edge.x;
                  // mesh.position.y = y + 0.5 + edge.y;
                  // mesh.position.z = z + 0.5 + edge.z;
                  // mesh.freezeWorldMatrix();

                  // mesh.instancedBuffers.color =  new Color4(1, 1, 0, 1);

                  corner.edges[cornerIndexToEdgeIndex[i]] = {
                    x: edge.x,
                    y: edge.y,
                    z: edge.z,
                  };
                } else {
                  //console.log("no edge");
                }
              }
            }
          } else {
            if (config !== "00000000") {
              // console.log("not found");
            }
          }
        }
      }
    }
  }

  drawCorners() {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          if (this.data[x][y][z].edges.findIndex((i) => i !== null) >= 0) {
            const mesh = this.transparentSphereMesh.createInstance(`lol`);

            mesh.parent = this.root;

            mesh.position.x = x;
            mesh.position.y = y;
            mesh.position.z = z;
            mesh.freezeWorldMatrix();

            mesh.instancedBuffers.color =
              this.data[x][y][z].v === "solid"
                ? new Color4(1, 1, 1, 0.6)
                : new Color4(0, 0, 1, 0.2);
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
              const mesh = this.opaqueSphereMesh.createInstance(`lol`);

              mesh.parent = this.root;

              mesh.position.x = x + (0.5 - cornerPos.x) + edgePos.x;
              mesh.position.y = y + (0.5 - cornerPos.y) + edgePos.y;
              mesh.position.z = z + (0.5 - cornerPos.z) + edgePos.z;
              mesh.freezeWorldMatrix();

              if (
                Math.abs(edgePos.x) > 0.5 ||
                Math.abs(edgePos.y) > 0.5 ||
                Math.abs(edgePos.z) > 0.5
              ) {
                mesh.instancedBuffers.color = new Color4(1, 0, 0, 1);
              } else {
                mesh.instancedBuffers.color = new Color4(1, 1, 0, 1);
              }
            }
          }
        }
      }
    }
  }

  computeLines() {
    console.log("computeEdges");
    for (let x = 1; x < this.size - 1; x++) {
      for (let y = 1; y < this.size - 1; y++) {
        for (let z = 1; z < this.size - 1; z++) {
          const cornerData = this.data[x][y][z];

          [1, -1].forEach((sign) => {
            ["x", "y", "z"].forEach((axis) => {
              const selfAxisCornerIndexes = cornerIndexToPosition
                .map((c, i) => (c[axis] === (sign === 1 ? 1 : 0) ? i : -1))
                .filter((i) => i >= 0);

              for (const selfAxisCornerIndex of selfAxisCornerIndexes) {
                const selfCorner = cornerIndexToPosition[selfAxisCornerIndex];
                const selfEdge =
                  cornerData.edges[cornerIndexToEdgeIndex[selfAxisCornerIndex]];

                if (selfEdge) {
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
                        const cornerTriangles: Position[] = [];
                        cornerTriangles.push({
                          x: x + (0.5 - selfCorner.x) + selfEdge.x,
                          y: y + (0.5 - selfCorner.y) + selfEdge.y,
                          z: z + (0.5 - selfCorner.z) + selfEdge.z,
                        });
                        cornerTriangles.push({
                          x: x + (0.5 - otherCorner.x) + otherEdge.x,
                          y: y + (0.5 - otherCorner.y) + otherEdge.y,
                          z: z + (0.5 - otherCorner.z) + otherEdge.z,
                        });
                        this.lines.push(cornerTriangles);
                      } else {
                        const farAxisCornerIndexes = cornerIndexToPosition
                          .map((c, i) =>
                            c[axis] === (sign === -1 ? 0 : 1) ? i : -1
                          )
                          .filter((i) => i >= 0);

                        const farCornerIndex = farAxisCornerIndexes.find(
                          (i) =>
                            cornerIndexToPosition[selfAxisCornerIndex][
                              otherAxis
                            ] === cornerIndexToPosition[i][otherAxis] &&
                            cornerIndexToPosition[selfAxisCornerIndex][
                              lastAxis
                            ] === cornerIndexToPosition[i][lastAxis]
                        )!;

                        if (farCornerIndex === undefined) {
                          throw new Error("tf2");
                        }

                        const farCornerData =
                          this.data[x + (axis === "x" ? sign : 0)][
                            y + (axis === "y" ? sign : 0)
                          ][z + (axis === "z" ? sign : 0)];

                        const farCorner = cornerIndexToPosition[farCornerIndex];
                        const farEdge =
                          farCornerData.edges[
                            cornerIndexToEdgeIndex[farCornerIndex]
                          ];

                        if (farEdge) {
                          const cornerTriangles: Position[] = [];
                          cornerTriangles.push({
                            x: x + (0.5 - selfCorner.x) + selfEdge.x,
                            y: y + (0.5 - selfCorner.y) + selfEdge.y,
                            z: z + (0.5 - selfCorner.z) + selfEdge.z,
                          });
                          cornerTriangles.push({
                            x:
                              x +
                              (axis === "x" ? sign : 0) +
                              (0.5 - farCorner.x) +
                              farEdge.x,
                            y:
                              y +
                              (axis === "y" ? sign : 0) +
                              (0.5 - farCorner.y) +
                              farEdge.y,
                            z:
                              z +
                              (axis === "z" ? sign : 0) +
                              (0.5 - farCorner.z) +
                              farEdge.z,
                          });
                          this.lines.push(cornerTriangles);
                        } else {
                          const farOpposedAxisCornerIndexes =
                            cornerIndexToPosition
                              .map((c, i) =>
                                c[axis] === (sign === -1 ? 0 : 1) ? i : -1
                              )
                              .filter((i) => i >= 0);

                          const farOpposedCornerIndex =
                            farOpposedAxisCornerIndexes.find(
                              (i) =>
                                cornerIndexToPosition[selfAxisCornerIndex][
                                  otherAxis
                                ] === cornerIndexToPosition[i][otherAxis] &&
                                cornerIndexToPosition[selfAxisCornerIndex][
                                  lastAxis
                                ] === cornerIndexToPosition[i][lastAxis]
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
                            const cornerTriangles: Position[] = [];
                            cornerTriangles.push({
                              x: x + (0.5 - selfCorner.x) + selfEdge.x,
                              y: y + (0.5 - selfCorner.y) + selfEdge.y,
                              z: z + (0.5 - selfCorner.z) + selfEdge.z,
                            });
                            cornerTriangles.push({
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
                            });
                            this.lines.push(cornerTriangles);
                          }
                        }
                      }
                    });
                }
              }

              //   const otherAxisCornerIndexes = cornerIndexToPosition
              //     .map((c, i) => (c[axis] === (sign === -1 ? 1 : 0) ? i : -1))
              //     .filter((i) => i >= 0);

              //   for (let i = 0; i < 4; i++) {
              //     const selfEdge =
              //       cornerData.edges[cornerIndexToEdgeIndex[self[i]]];

              //     if (selfEdge !== null) {
              //       cornerTriangles.push({
              //         x: x + (0.5 - selfCorner.x) + selfEdge.x,
              //         y: y + (0.5 - selfCorner.y) + selfEdge.y,
              //         z: z + (0.5 - selfCorner.z) + selfEdge.z,
              //       });
              //     }

              //     const otherCorner = cornerIndexToPosition[other[i]];
              //     const otherEdge =
              //       relativeCorderData.edges[
              //         cornerIndexToEdgeIndex[other[i]]
              //       ];

              //     if (otherEdge !== null) {
              //       cornerTriangles.push({
              //         x:
              //           x +
              //           (axis === "x" ? sign : 0) +
              //           (0.5 - otherCorner.x) +
              //           otherEdge.x,
              //         y:
              //           y +
              //           (axis === "y" ? sign : 0) +
              //           (0.5 - otherCorner.y) +
              //           otherEdge.y,
              //         z:
              //           z +
              //           (axis === "z" ? sign : 0) +
              //           (0.5 - otherCorner.z) +
              //           otherEdge.z,
              //       });
              //     }
              //   }

              // if (cornerTriangles.length) {
              //   this.lines.push(cornerTriangles);
              // }
            });
          });
        }
      }
    }
  }

  computeTriangles() {
    console.log("computeEdges");
    for (let x = 1; x < this.size - 1; x++) {
      for (let y = 1; y < this.size - 1; y++) {
        for (let z = 1; z < this.size - 1; z++) {
          const cornerData = this.data[x][y][z];

          if (true || cornerData.v === "solid") {
            const cornerTriangles: Position[] = [];

            [1, -1].forEach((sign) => {
              ["x", "y", "z"].forEach((axis) => {
                const relativeCorderData =
                  this.data[x + (axis === "x" ? sign : 0)][
                    y + (axis === "y" ? sign : 0)
                  ][z + (axis === "z" ? sign : 0)];

                if (true || relativeCorderData.v === "gaz") {
                  const self = cornerIndexToPosition
                    .map((c, i) => (c[axis] === (sign === 1 ? 0 : 1) ? i : -1))
                    .filter((i) => i >= 0);

                  const other = cornerIndexToPosition
                    .map((c, i) => (c[axis] === (sign === -1 ? 1 : 0) ? i : -1))
                    .filter((i) => i >= 0);

                  for (let i = 0; i < 4; i++) {
                    const selfCorner = cornerIndexToPosition[self[i]];
                    const selfEdge =
                      cornerData.edges[cornerIndexToEdgeIndex[self[i]]];

                    if (selfEdge !== null) {
                      cornerTriangles.push({
                        x: x + (0.5 - selfCorner.x) + selfEdge.x,
                        y: y + (0.5 - selfCorner.y) + selfEdge.y,
                        z: z + (0.5 - selfCorner.z) + selfEdge.z,
                      });
                    }

                    const otherCorner = cornerIndexToPosition[other[i]];
                    const otherEdge =
                      relativeCorderData.edges[
                        cornerIndexToEdgeIndex[other[i]]
                      ];

                    if (otherEdge !== null) {
                      cornerTriangles.push({
                        x:
                          x +
                          (axis === "x" ? sign : 0) +
                          (0.5 - otherCorner.x) +
                          otherEdge.x,
                        y:
                          y +
                          (axis === "y" ? sign : 0) +
                          (0.5 - otherCorner.y) +
                          otherEdge.y,
                        z:
                          z +
                          (axis === "z" ? sign : 0) +
                          (0.5 - otherCorner.z) +
                          otherEdge.z,
                      });
                    }
                  }
                }
              });
            });

            // const filtered = cornerTriangles.filter(function (item, pos, self) {
            //   return (
            //     self.findIndex(
            //       (i) => item.x === i.x && item.y === i.y && item.z === i.z
            //     ) == pos
            //   );
            // });

            const filtered = cornerTriangles;

            if (filtered.length >= 3) {
              for (let i = 2; i < filtered.length; i++) {
                this.triangles.push([
                  filtered[i - 2],
                  filtered[i - 1],
                  filtered[i],
                ]);
              }
            }
          }
        }
      }
    }
  }

  drawLines() {
    console.log("draw triangles");

    const customMesh = MeshBuilder.CreateLineSystem(
      "lineSystem",
      {
        lines: this.lines.map((l) =>
          l.map((li) => new Vector3(li.x, li.y, li.z))
        ),
      },
      this.scene
    );

    customMesh.parent = this.root;

    customMesh.color = Color3.Yellow();
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

    vertexData.positions = positions;
    vertexData.indices = indices;

    vertexData.applyToMesh(customMesh);

    const mat = new StandardMaterial("mat", this.scene);
    mat.backFaceCulling = false;
    mat.diffuseColor = Color3.Yellow();
    //mat.wireframe = true;
    customMesh.material = mat;
  }
}
