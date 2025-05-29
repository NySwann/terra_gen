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
  edgesConfigs: [
    string | null,
    string  | null,
    string  | null,
    string  | null,
   string  | null,
    string  | null,
    string  | null,
    string  | null
  ];
}

function abs(p: Position)
{
  return {x: Math.abs(p.x), y: Math.abs(p.y), z: Math.abs(p.z)};
}

function min(a: Position, b: Position)
{
  return {x: Math.min(a.x, b.x), y: Math.min(a.x, b.y), z: Math.min(a.z, b.z)};
}

function minn(a: Position, b: number)
{
  return {x: Math.min(a.x, b), y: Math.min(a.x, b), z: Math.min(a.z, b)};
}

function max(a: Position, b: Position)
{
  return {x: Math.max(a.x, b.x), y: Math.max(a.x, b.y), z: Math.max(a.z, b.z)};
}

function maxn(a: Position, b: number)
{
  return {x: Math.max(a.x, b), y: Math.max(a.x, b), z: Math.max(a.z, b)};
}

function sub(a: Position, b: Position)
{
  return {x: a.x - b.x, y: a.y - b.y, z: a.z - b.z};
}

function subn(a: Position, b: number)
{
  return {x: a.x - b, y: a.y - b, z: a.z - b};
}

function add(a: Position, b: Position)
{
  return {x: a.x + b.x, y: a.y + b.y, z: a.z + b.z};
}

function addn(a: Position, b: number)
{
  return {x: a.x + b, y: a.y + b, z: a.z + b};
}

function vec3(x: number, y: number, z: number)
{
  return {x, y, z};
}

function length(p: Position)
{
  return Math.sqrt((p.x * p.x) + (p.y * p.y) + (p.z * p.z));
}

function sdRoundBox(p: Position, b: Position, r: number ): number
{
  const q: Position = addn(sub(abs(p), b), r);

  return length(maxn(q,0.0)) + Math.min(Math.max(q.x,Math.max(q.y,q.z)),0.0) - r;
}

function sdBoxFrame(p: Position, b: Position, e: number): number
{
  const p2 = sub(abs(p), b);
  const q = abs(subn(addn(p2,e), e));
  return Math.min(Math.min(
      length(maxn(vec3(p2.x,q.y,q.z),0.0))+Math.min(Math.max(p2.x,Math.max(q.y,q.z)),0.0),
      length(maxn(vec3(q.x,p2.y,q.z),0.0))+Math.min(Math.max(q.x,Math.max(p2.y,q.z)),0.0)),
      length(maxn(vec3(q.x,q.y,p2.z),0.0))+Math.min(Math.max(q.x,Math.max(q.y,p2.z)),0.0));
}

export class Terrain {
  scene: Scene;
  size: number;
  data: Block[][][];
  opaqueSphereMesh: Mesh;
  transparentSphereMesh: Mesh;
  triangles: [Position, Position, Position][];
  lines: [Position, Position][];
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

        this.opaqueSphereMesh.position.set(100, 100, 100);
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

          v ||=
            noise.noise3D(x / 16, y / 16, z / 16) +
              noise.noise3D(x / 32, y / 32, z / 32) >=
            0.5;

          v ||= x == this.size / 2 && y == this.size / 2 && z == this.size / 2;

          const sphereRadius = 4;
          const spherePosition = {x: 0 + sphereRadius + 2, y: 0 + sphereRadius + 2, z: 0 + sphereRadius + 2};

           v ||=
            Math.sqrt(
              (x - spherePosition.x ) * (x - spherePosition.x ) +
                (y - spherePosition.y ) * (y - spherePosition.y ) +
                + (z - spherePosition.z ) * (z - spherePosition.z )
            ) < sphereRadius;

          // v ||= Math.random() <= 0.1;
          v ||= (x ==10);
          v ||= x == 10 && y == 10 && z == 10;

          const cubeRadius = 4;
          const cubePosition = {x: this.size - cubeRadius - 2, y: this.size - cubeRadius - 2, z: this.size - cubeRadius - 2};

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

              corner.edgesConfigs[cornerIndexToEdgeIndex[i]] = config;

              if (true || corner.v === "solid" || corner.v === "gaz") {
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
    for (let x = 0; x < this.size - 1; x++) {
      for (let y = 0; y < this.size - 1; y++) {
        for (let z = 0; z < this.size - 1; z++) {
          const corner = this.data[x][y][z];

          if (corner.edgesConfigs.some(c => c !== "00000000" && c !== "11111111" && c !== null)) {
            const mesh = this.transparentSphereMesh.createInstance(`lol`);

            mesh.parent = this.root;

            mesh.position.x = x;
            mesh.position.y = y;
            mesh.position.z = z;
            mesh.freezeWorldMatrix();

            mesh.instancedBuffers.color =
              this.data[x][y][z].v === "solid"
                ? new Color4(1, 0, 0, 1)
                : new Color4(0, 0, 1, 0.0);
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
                                                      const farCornerData =
                          this.data[x + (axis === "x" ? sign : 0)][
                            y + (axis === "y" ? sign : 0)
                          ][z + (axis === "z" ? sign : 0)];

              const selfAxisCornerIndexes = cornerIndexToPosition
                .map((c, i) => (c[axis] === (sign === 1 ? 1 : 0) ? i : -1))
                .filter((i) => i >= 0);

                if (selfAxisCornerIndexes.length !== 4) {
                  throw new Error();
                }

              const revertedSelfAxisCornerIndexes = cornerIndexToPosition
                .map((c, i) => (c[axis] === (sign === 1 ? 0 : 1) ? i : -1))
                .filter((i) => i >= 0);


                if (revertedSelfAxisCornerIndexes.length !== 4) {
                  throw new Error();
                }

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
                        this.lines.push(cornerTriangles);
                      }

                      else if (false) {
                          const otherCornerIndex = revertedSelfAxisCornerIndexes.find(
                          (i) =>
                            cornerIndexToPosition[selfAxisCornerIndex][
                              otherAxis
                            ] === cornerIndexToPosition[i][otherAxis] &&
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
                          farCornerData.edges[
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
                            }
                        ];
                        this.lines.push(cornerTriangles);
                        }
                        
                       else if (false) {
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
}
