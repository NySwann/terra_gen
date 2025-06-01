import { Scene } from "@babylonjs/core/scene";
import {
  Camera,
  Color3,
  Color4,
  KeyboardEventTypes,
  Matrix,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector2,
  Vector3,
  VertexData,
} from "@babylonjs/core";

const axisNames = ["x", "y", "z"] as const;
const axisDirection = [1, -1] as const;

import {
  configIndexToEdgePositions,
  configIndexToStr,
  cornerIndexToEdgeIndex,
  cornerIndexToPosition,
} from "./Table";
import MainScene from "../scenes/MainScene/MainScene";

interface Quad {
  points: [Point, Point, Point, Point];
}

interface Line {
  a: Point,
  b: Point,
  quads: Quad[];
}

interface Point {
  position: Vector3;
  lines: Line[];
}
type Material = "gaz" | "solid";

interface Block {
  v: Material;
}

interface Voxel {
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

function is_zero(v: Vector3) {
  return eqn(v.x, 0) && eqn(v.y, 0) && eqn(v.x, 0);
}

function eqn(a: number, b: number) {
  return Math.abs(a - b) < 0.00001;
}

function distance(a: Vector3, b: Vector3) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z));
}

let lines = true;
let debug = false;

export class Terrain {
  scene: MainScene;
  size: number;
  blocks: Block[];
  voxels: Voxel[];
  cubeMesh: Mesh;
  transparentSphereMesh: Mesh;
  triangles: [Vector3, Vector3, Vector3][];
  meshLines: [Vector3, Vector3][];
  ownerLines: [Vector3, Vector3][];
  debugLines: [Vector3, Vector3][];
  gridRoot: TransformNode;
  rendered: TransformNode;

  constructor(scene: MainScene) {
    this.scene = scene;

    this.size = 50;
    this.blocks = new Array(this.size * this.size * this.size).fill(null).map(() => ({
      v: "gaz",
    }));

    this.prepareVoxels();

    this.gridRoot = new TransformNode("root", this.scene);
    this.gridRoot.position.set(-this.size / 2, -this.size / 2, -this.size / 2);

    this.rendered = new TransformNode("root2", this.scene);
    this.rendered.parent = this.gridRoot;

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

    this.cubeMesh.position.set(100, 100, 100);

    scene.onKeyboardObservable.add((kbInfo) => {
      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          switch (kbInfo.event.key) {
            case "d":
              debug = !debug;
              this.prepareVoxels();
              this.rendered.dispose();
              this.rendered = new TransformNode("root2", this.scene);
              this.rendered.parent = this.gridRoot;
              this.render();
              break;
            case "l":
              lines = !lines;
              this.prepareVoxels();
              this.rendered.dispose();
              this.rendered = new TransformNode("root2", this.scene);
              this.rendered.parent = this.gridRoot;
              this.render();
              break;
          }
      }
    });
  }

  render() {
    this.compute();
    !debug && this.draw();

    lines && this.drawMeshLines();

    debug && this.drawCorners();
    debug && this.drawEdges();
    debug && this.drawOwnerLines();
    debug && this.drawDebugLines();
  }

  rerender() {
    this.rendered.dispose();
    this.rendered = new TransformNode("root2", this.scene);
    this.rendered.parent = this.gridRoot;
    this.prepareVoxels();
    this.render();
  }

  prepareVoxels() {
    this.voxels = new Array(this.size * this.size * this.size).fill(null).map(() => ({
      edges: [null, null, null, null, null, null, null, null],
      edgesConfigs: [null, null, null, null, null, null, null, null],
      points: [],
    }));
    this.triangles = [];
    this.meshLines = [];
    this.ownerLines = [];
    this.debugLines = [];
  }

  setBlockMaterial(x: number, y: number, z: number, v: "solid" | "gaz") {
    return this.blocks[x * (this.size * this.size) + y * (this.size) + z].v = v;
  }

  getVoxel(x: number, y: number, z: number) {
    return this.voxels[x * (this.size * this.size) + y * (this.size) + z];
  }

  getVoxelPosFromFloat(x: number, y: number, z: number) {
    return new Vector3(Math.floor(x), Math.floor(y), Math.floor(z));
  }

  getBlock(x: number, y: number, z: number) {
    return this.blocks[x * (this.size * this.size) + y * (this.size) + z];
  }

  removeShit(x: number, y: number, z: number) {

    console.log(this.getBlock(x, y, z));
    console.log("removeShit")
    this.setBlockMaterial(x, y, z, "gaz");

    this.rerender();
  }

  minBound(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  maxBound(): Vector3 {
    return new Vector3(this.size, this.size, this.size);
  }

  voxelSize(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  getPoint(x: number, y: number, z: number): Point {
    const voxel = this.getVoxel(Math.floor(x), Math.floor(y), Math.floor(z));

    if (!voxel) {
      console.log(x, y, z);
    }

    for (const point of voxel.points) {
      const position = point.position;

      if (eqn(x, position.x) && eqn(y, position.y) && eqn(z, position.z)) {
        return point;
      }
    }

    const point = { position: new Vector3( x, y, z ), lines: [] };

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

    const a1 = new Vector3(triangles[0][1].x - triangles[0][0].x,  triangles[0][1].y - triangles[0][0].y,  triangles[0][1].z - triangles[0][0].z )
    const b1 = new Vector3(triangles[0][2].x - triangles[0][0].x,  triangles[0][2].y - triangles[0][0].y,  triangles[0][2].z - triangles[0][0].z )
    const n1 = new Vector3(a1.y * b1.z - a1.z * b1.y,  a1.z * b1.x - a1.x * b1.z,  a1.x * b1.y - a1.y * b1.x );

    const a2 = new Vector3(triangles[1][1].x - triangles[1][0].x,  triangles[1][1].y - triangles[1][0].y,  triangles[1][1].z - triangles[1][0].z )
    const b2 = new Vector3(triangles[1][2].x - triangles[1][0].x,  triangles[1][2].y - triangles[1][0].y,  triangles[1][2].z - triangles[1][0].z )
    const n2 = new Vector3(a2.y * b2.z - a2.z * b2.y,  a2.z * b2.x - a2.x * b2.z,  a2.x * b2.y - a2.y * b2.x );

    const diff = Vector3.Dot(new Vector3(n1.x, n1.y, n1.z).normalize(), new Vector3(n2.x, n2.y, n2.z).normalize());

    if (diff < 0.9) {
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
  
  computeEdges(x: number, y: number, z: number) {
          const config = [
            this.getBlock(x, y, z),
            this.getBlock(x + 1, y, z),
            this.getBlock(x, y, z + 1),
            this.getBlock(x + 1, y, z + 1),
            this.getBlock(x, y + 1, z),
            this.getBlock(x + 1, y + 1, z),
            this.getBlock(x, y + 1, z + 1),
            this.getBlock(x + 1, y + 1, z + 1),
          ]
            .map((d) => (d.v === "solid" ? "1" : "0"))
            .join("");

          if (x === 13 && y === 38 && z === 36) {
            console.log(config);
          }

          const configIndex = configIndexToStr.findIndex((v) => v === config);

          if (configIndex >= 0) {
            const configuration = configIndexToEdgePositions?.[configIndex];

            for (let i = 0; i < 8; i++) {
              const cornerPos = cornerIndexToPosition[i];

              const corner =
                this.getVoxel(x + cornerPos.x, y + cornerPos.y, z + cornerPos.z);

              corner.edgesConfigs[cornerIndexToEdgeIndex[i]] = config;

              const edge = configuration?.[i];


              if (x + cornerPos.x == 13 &&  y + cornerPos.y == 38 && z + cornerPos.z == 36) {
                console.log(edge);
              }

              if (edge) {
                const px = x + 0.5 + edge.x;
                const py = y + 0.5 + edge.y;
                const pz = z + 0.5 + edge.z;

                const point = this.getPoint(px, py, pz);

                              if (x + cornerPos.x == 13 &&  y + cornerPos.y == 38 && z + cornerPos.z == 36) {
                console.log(point.position);
              }

                corner.edges[cornerIndexToEdgeIndex[i]] = point;
              }
            }
          }
  }

  compute() {
    for (let x = 0; x < this.size - 1; x++) {
      for (let y = 0; y < this.size - 1; y++) {
        for (let z = 0; z < this.size - 1; z++) {
          this.computeEdges(x, y, z);
          if (x < this.size - 2) {
          this.computeEdges(x + 1, y, z);
          }
          if (y < this.size - 2) {
          this.computeEdges(x, y + 1, z);
          }
          if (z < this.size - 2) {
          this.computeEdges(x, y, z + 1);
          }

          if (x > 1 && y > 1 && z > 1) {

            const cornerData = this.getVoxel(x, y, z);

            if (!cornerData.edgesConfigs.some(c => c !== "00000000" && c !== "11111111" && c !== null)) {
              continue;
            }

            const allSelf = cornerData.edges.every(e => e !== null);

            axisDirection.forEach((sign) => {
              axisNames.forEach((axis) => {
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
                      new Vector3(x, y, z),
                      new Vector3(
                        selfEdge.position.x,
                        selfEdge.position.y,
                        selfEdge.position.z,
                      )
                    ]);

                   axisNames
                      .filter((a) => axis !== a)
                      .map((otherAxis) => {
                        const lastAxis = axisNames.find(
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

                        const farOpposedCornerData =
                            this.getVoxel(x + (axis === "x" ? sign : 0),
                              y + (axis === "y" ? sign : 0)
                              , z + (axis === "z" ? sign : 0));

                        const allFar = farOpposedCornerData.edges.every(e => e !== null);

                        if (!allSelf && !allFar)
                        {
                          if (x == 13 && y == 38 && z == 36) {
                            console.log(cornerData);
                            console.log(farOpposedCornerData);
                          }
                          if (x == 13 && y == 37 && z == 36 && axis == "y" && sign == 1) {
                            console.log(cornerData);
                            console.log(cornerData.edges.every(e => e !== null))
                            console.log(farOpposedCornerData);
                            console.log(farOpposedCornerData.edges.every(e => e !== null));
                            console.log(farOpposedCornerData.edges);
                          }
                          const farOpposedCornerIndex =
                            revertedSelfAxisCornerIndexes.find(
                              (i) =>
                                cornerIndexToPosition[selfAxisCornerIndex][otherAxis] == cornerIndexToPosition[i][otherAxis] &&
                                cornerIndexToPosition[selfAxisCornerIndex][lastAxis] !== cornerIndexToPosition[i][lastAxis]
                            )!;

                          if (farOpposedCornerIndex === undefined) {
                            throw new Error("tf2");
                          }

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
          const voxel = this.getVoxel(x, y, z);
          const block = this.getBlock(x, y, z);

          if (voxel.edgesConfigs.some(c => c !== "00000000" && c !== "11111111" && c !== null)) {
            if (block.v === "solid") {
              const mesh = this.cubeMesh.createInstance(`lol`);

              mesh.parent = this.rendered;

              mesh.position.x = x;
              mesh.position.y = y;
              mesh.position.z = z;
              mesh.freezeWorldMatrix();

              mesh.instancedBuffers.color = new Color4(1, 0, 0, 1)
            } else {
              const mesh = this.cubeMesh.createInstance(`lol`);

              mesh.parent = this.rendered;

              mesh.position.x = x;
              mesh.position.y = y;
              mesh.position.z = z;
              mesh.freezeWorldMatrix();

              mesh.instancedBuffers.color = new Color4(0, 0, 1, 0);
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
            const cornerData = this.getVoxel(x, y, z);

            for (const point of cornerData.points) {
              const mesh = this.cubeMesh.createInstance(`lol`);

              mesh.parent = this.rendered;

              mesh.position.x = point.position.x;
              mesh.position.y = point.position.y;
              mesh.position.z = point.position.z;
              mesh.scaling.set(0.4, 0.4, 0.4);
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

    customMesh.parent = this.rendered;
    customMesh.color = new Color3(.2, 0.8, 1).scale(0.9);

    const i2 = customMesh.createInstance('l');
    i2.position.set(0.01, 0, 0);
    i2.parent = this.rendered;

    const i3 = customMesh.createInstance('l');
    i3.position.set(0, 0.01, 0);
    i3.parent = this.rendered;

    const i4 = customMesh.createInstance('l');
    i4.position.set(0, 0, 0.01);
    i4.parent = this.rendered;
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

    customMesh.parent = this.rendered;

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

    customMesh.parent = this.rendered;

    customMesh.color = Color3.White();
  }

  draw() {
    const customMesh = new Mesh("custom", this.scene);

    customMesh.parent = this.rendered;

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