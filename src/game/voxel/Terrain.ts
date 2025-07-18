import { Scene } from "@babylonjs/core/scene";
import {
  Camera,
  Color3,
  Color4,
  KeyboardEventTypes,
  LinesMesh,
  Matrix,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeMesh,
  PhysicsShapeType,
  StandardMaterial,
  TransformNode,
  Vector2,
  Vector3,
  VertexBuffer,
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

interface Triangle {
  points: [Point, Point, Point];
  quad: Quad;
  dead: boolean;
}

interface Quad {
  points: [Point, Point, Point, Point];
  lines: [Line, Line, Line, Line];
  triangles: [Triangle, Triangle];
}

interface Line {
  a: Point;
  b: Point;
  quads: Quad[];
}

interface Point {
  position: Vector3;
  lines: Line[];
  dead: boolean;
  voxels: Vector3[];
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
  points: Point[];
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
  return Math.sqrt(
    (a.x - b.x) * (a.x - b.x) +
    (a.y - b.y) * (a.y - b.y) +
    (a.z - b.z) * (a.z - b.z)
  );
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
  triangles: Triangle[];
  meshLines: [Point, Point][];
  debugLines: [Vector3, Vector3][];
  gridRoot: TransformNode;
  rendered: TransformNode;
  editBounds: { min: Vector3, max: Vector3 } | null;
  terrainMesh: Mesh;
  linesMesh: LinesMesh;
  terrainBody: PhysicsBody;

  constructor(scene: MainScene) {
    this.scene = scene;

    this.size = 60;
    this.blocks = new Array(this.size * this.size * this.size)
      .fill(null)
      .map(() => ({
        v: "gaz",
      }));

    this.editBounds = null;;

    this.prepareVoxels();

    this.gridRoot = new TransformNode("root", this.scene);
    this.gridRoot.position.set(-this.size / 2, -this.size / 2, -this.size / 2);

    this.rendered = new TransformNode("root2", this.scene);
    this.rendered.parent = this.gridRoot;

    // const t = MeshBuilder.CreateSphere(
    //   "sphere",
    //   { diameter: 3, segments: 10 },
    //   this.scene
    // );

    // const tmaterial = new StandardMaterial("t");
    // tmaterial.diffuseColor = Color3.Red();
    // t.material = tmaterial;

    this.cubeMesh = MeshBuilder.CreateBox("sphere", { size: 0.25 }, this.scene);
    this.cubeMesh.registerInstancedBuffer("color", 4);
    this.cubeMesh.instancedBuffers.color = new Color4(0.2, 0.6, 0.4, 1.0);

    this.cubeMesh.position.set(100, 100, 100);

    scene.onKeyboardObservable.add((kbInfo) => {
      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          switch (kbInfo.event.key) {
            case "d":
              debug = !debug;
              this.terrainMesh = null;
              this.rendered.dispose();
              this.rendered = new TransformNode("root2", this.scene);
              this.rendered.parent = this.gridRoot;
              this.render();
              break;
            case "l":
              lines = !lines;
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
    !debug && this.draw();

    lines && this.drawMeshLines();

    debug && this.drawCorners();
    debug && this.drawEdges();
    debug && this.drawOwnerLines();
    debug && this.drawDebugLines();

    this.editBounds = null;
  }

  rerender() {
    if (!this.editBounds) {
      return;
    }

    console.log(`(${this.editBounds.min.x.toString()} -> ${this.editBounds.max.x.toString()}, ${this.editBounds.min.y.toString()} -> ${this.editBounds.max.y.toString()}, ${this.editBounds.min.z.toString()} -> ${this.editBounds.max.z.toString()})`)

    this.removePoints();

    if (debug) {
      this.rendered.dispose();
      this.rendered = new TransformNode("root2", this.scene);
      this.rendered.parent = this.gridRoot;
    }
    this.compute();
    this.render();

    this.editBounds = null;
  }

  prepareVoxels() {
    this.voxels = new Array(this.size * this.size * this.size)
      .fill(null)
      .map(() => ({
        edges: [null, null, null, null, null, null, null, null],
        edgesConfigs: [null, null, null, null, null, null, null, null],
        points: [],
      }));
    this.triangles = [];
    this.meshLines = [];
    this.debugLines = [];
  }

  setBlockMaterial(x: number, y: number, z: number, v: "solid" | "gaz"): void {
    if (x < 0 || y < 0 || z < 0 || x >= this.size || y >= this.size || z >= this.size) {
      throw new Error(`Out of bounds: (${x.toString()}, ${y.toString()}, ${z.toString()})`);
    }

    const block = this.blocks[x * (this.size * this.size) + y * this.size + z];

    if (block.v === v) {
      return;
    }

    const position = new Vector3(x, y, z);

    if (!this.editBounds) {
      this.editBounds = { min: position, max: position };
    } else {
      this.editBounds = { min: Vector3.Minimize(position, this.editBounds.min), max: Vector3.Maximize(position, this.editBounds.max) };
    }

    this.blocks[x * (this.size * this.size) + y * this.size + z].v = v;
  }

  getVoxel(x: number, y: number, z: number) {
    return this.voxels[x * (this.size * this.size) + y * this.size + z];
  }

  getBlock(x: number, y: number, z: number) {
    return this.blocks[x * (this.size * this.size) + y * this.size + z];
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
    const voxel = this.getVoxel(Math.round(x), Math.round(y), Math.round(z));

    if (!voxel) {
      throw new Error();
    }

    for (const point of voxel.points) {
      const position = point.position;

      if (eqn(x, position.x) && eqn(y, position.y) && eqn(z, position.z)) {
        return point;
      }
    }

    const point: Point = { position: new Vector3(x, y, z), lines: [], voxels: [], dead: false };

    voxel.points.push(point);

    return point;
  }

  checkLinesForQuadDissolve(lines: Line[]) {
    for (const line of lines) {
      if (line.quads.length > 2) {
        for (const quad of line.quads) {
          if (quad.lines.every(l => l.quads.length > 2)) {
            this.triangles = this.triangles.filter(t => t.quad !== quad);
            quad.lines.forEach(l => {
              l.quads = l.quads.filter(q => q !== quad);
            });
            this.meshLines = this.meshLines.filter(l => (l[0] !== quad.points[0] || l[1] !== quad.points[2]) && (l[1] !== quad.points[0] || l[0] !== quad.points[2]));
            this.meshLines = this.meshLines.filter(l => (l[0] !== quad.points[1] || l[1] !== quad.points[3]) && (l[1] !== quad.points[1] || l[0] !== quad.points[3]));
          }
        }
      }
    }
  }

  makeQuad(p1: Point, p2: Point, p3: Point, p4: Point) {
    if (new Set([p1, p2, p3, p4]).size !== 4) {
      return;
    }

    // if (
    //   p1.lines.length > 4 &&
    //   p2.lines.length > 4 &&
    //   p3.lines.length > 4 &&
    //   p4.lines.length > 4
    // ) {
    //   return;
    // }

    const lines: [Line, Line, Line, Line] = [p1.lines.find((l) => is_line(l, p1, p2))!, p2.lines.find((l) => is_line(l, p2, p3))!, p3.lines.find((l) => is_line(l, p3, p4))!, p4.lines.find((l) => is_line(l, p4, p1))!];

    const quad: Quad = { points: [p1, p2, p3, p4], lines };

    lines.forEach(l => l.quads.push(quad));

    const d1 = distance(p1.position, p3.position);
    const d2 = distance(p2.position, p4.position);

    let triangles: [Triangle, Triangle];

    if (d1 <= d2) {
      triangles = [
        { points: [p1, p2, p3], quad, dead: false },
        { points: [p3, p4, p1], quad, dead: false },
      ];
    } else {
      triangles = [
        { points: [p2, p3, p4], quad, dead: false },
        { points: [p4, p1, p2], quad, dead: false },
      ];
    }

    quad.triangles = triangles;

    this.triangles.push(...triangles);

    // si le quad est pas du tout planar, on se rajoute une petite ligne pour que ca looks good

    if (debug) {
      return;
    }

    const a1 = new Vector3(
      triangles[0].points[1].position.x - triangles[0].points[0].position.x,
      triangles[0].points[1].position.y - triangles[0].points[0].position.y,
      triangles[0].points[1].position.z - triangles[0].points[0].position.z
    );
    const b1 = new Vector3(
      triangles[0].points[2].position.x - triangles[0].points[0].position.x,
      triangles[0].points[2].position.y - triangles[0].points[0].position.y,
      triangles[0].points[2].position.z - triangles[0].points[0].position.z
    );
    const n1 = new Vector3(
      a1.y * b1.z - a1.z * b1.y,
      a1.z * b1.x - a1.x * b1.z,
      a1.x * b1.y - a1.y * b1.x
    );

    const a2 = new Vector3(
      triangles[1].points[1].position.x - triangles[1].points[0].position.x,
      triangles[1].points[1].position.y - triangles[1].points[0].position.y,
      triangles[1].points[1].position.z - triangles[1].points[0].position.z
    );
    const b2 = new Vector3(
      triangles[1].points[2].position.x - triangles[1].points[0].position.x,
      triangles[1].points[2].position.y - triangles[1].points[0].position.y,
      triangles[1].points[2].position.z - triangles[1].points[0].position.z
    );
    const n2 = new Vector3(
      a2.y * b2.z - a2.z * b2.y,
      a2.z * b2.x - a2.x * b2.z,
      a2.x * b2.y - a2.y * b2.x
    );

    const diff = Math.abs(Vector3.Dot(
      new Vector3(n1.x, n1.y, n1.z).normalize(),
      new Vector3(n2.x, n2.y, n2.z).normalize()
    ));

    if (diff <= 0.6) {
      this.meshLines.push([triangles[0].points[0], triangles[0].points[2]]);
    }

    this.checkLinesForQuadDissolve(p1.lines);
    this.checkLinesForQuadDissolve(p2.lines);
    this.checkLinesForQuadDissolve(p3.lines);
    this.checkLinesForQuadDissolve(p4.lines);
  }

  makeEdge(edge1: Point, edge2: Point) {
    const p1 = this.getPoint(
      edge1.position.x,
      edge1.position.y,
      edge1.position.z
    );

    const p2 = this.getPoint(
      edge2.position.x,
      edge2.position.y,
      edge2.position.z
    );

    if (p1 === p2) {
      return;
    }

    if (!p1.lines.some((l) => is_line(l, p1, p2))) {
      this.meshLines.push([p1, p2]);

      const line = { a: p1, b: p2, quads: [] };

      p1.lines.push(line);
      p2.lines.push(line);

      // search for quad

      for (const p1l of p1.lines) {
        const p1lp = p1l.a === p1 ? p1l.b : p1l.a;

        for (const p2l of p2.lines) {
          const p2lp = p2l.a === p2 ? p2l.b : p2l.a;

          if (
            p1lp !== p2 &&
            p2lp !== p1 &&
            p1lp.lines.some((l) => is_line(l, p1lp, p2lp))
          ) {
            this.makeQuad(p1, p2, p2lp, p1lp);
          }
        }
      }
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
      //console.log(config);
    }

    const configIndex = configIndexToStr.findIndex((v) => v === config);

    if (configIndex >= 0) {
      const configuration = configIndexToEdgePositions?.[configIndex];

      for (let i = 0; i < 8; i++) {
        const cornerPos = cornerIndexToPosition[i];

        const voxelPos = new Vector3(x + cornerPos.x, y + cornerPos.y, z + cornerPos.z);

        const corner = this.getVoxel(
          voxelPos.x,
          voxelPos.y,
          voxelPos.z,
        );

        corner.edgesConfigs[cornerIndexToEdgeIndex[i]] = config;

        const edge = configuration?.[i];

        if (
          x + cornerPos.x == 13 &&
          y + cornerPos.y == 38 &&
          z + cornerPos.z == 36
        ) {
          //console.log(edge);
        }

        if (edge) {
          const px = x + 0.5 + edge.x;
          const py = y + 0.5 + edge.y;
          const pz = z + 0.5 + edge.z;

          const point = this.getPoint(px, py, pz);

          if (
            x + cornerPos.x == 13 &&
            y + cornerPos.y == 38 &&
            z + cornerPos.z == 36
          ) {
            //console.log(point.position);
          }

          point.voxels.push(voxelPos);

          corner.edges[cornerIndexToEdgeIndex[i]] = point;
        }
      }
    }
  }

  removePoints() {
    const min_d = 2;
    const max_d = 3;

    const min = new Vector3(Math.max(this.editBounds?.min.x - min_d, 0), Math.max(this.editBounds?.min.y - min_d, 0), Math.max(this.editBounds?.min.z - min_d, 0));
    const max = new Vector3(Math.min(this.editBounds?.max.x + max_d, this.size), Math.min(this.editBounds?.max.y + max_d, this.size), Math.min(this.editBounds?.max.z + max_d, this.size));

    for (let x = min.x; x < max.x; x++) {
      for (let y = min.y; y < max.y; y++) {
        for (let z = min.z; z < max.z; z++) {
          const voxel = this.getVoxel(x, y, z);

          if (!voxel) {
            throw new Error();
          }

          for (const point of voxel.points) {
            point.dead = true;

            for (const line of point.lines) {
              if (line.a === point) {
                line.b.lines = line.b.lines.filter(l => l !== line);
              } else {
                line.a.lines = line.a.lines.filter(l => l !== line);
              }

              for (const quad of line.quads) {
                for (const otherLine of quad.lines) {
                  if (otherLine !== line) {
                    otherLine.quads = otherLine.quads.filter(q => q !== quad);
                  }
                }

                for (const triangle of quad.triangles) {
                  triangle.dead = true;
                }
              }
            }
          }

          voxel.edges = [null, null, null, null, null, null, null, null];
          voxel.edgesConfigs = [null, null, null, null, null, null, null, null];
          voxel.points = [];
        }
      }
    }

    this.meshLines = this.meshLines.filter(l => !l[0].dead && !l[1].dead);
    this.triangles = this.triangles.filter(t => !t.dead);
  }

  compute() {
    const min_d = 3;
    const max_d = 3;

    const min = new Vector3(Math.max(this.editBounds?.min.x - min_d, 0), Math.max(this.editBounds?.min.y - min_d, 0), Math.max(this.editBounds?.min.z - min_d, 0));
    const max = new Vector3(Math.min(this.editBounds?.max.x + max_d, this.size - 1), Math.min(this.editBounds?.max.y + max_d, this.size - 1), Math.min(this.editBounds?.max.z + max_d, this.size - 1));

    for (let x = min.x; x < max.x; x++) {
      for (let y = min.y; y < max.y; y++) {
        for (let z = min.z; z < max.z; z++) {
          this.computeEdges(x, y, z);
        }
      }
    }

    const min_d2 = 5;
    const max_d2 = 5;

    const min2 = new Vector3(Math.max(this.editBounds?.min.x - min_d2, 0), Math.max(this.editBounds?.min.y - min_d2, 0), Math.max(this.editBounds?.min.z - min_d2, 0));
    const max2 = new Vector3(Math.min(this.editBounds?.max.x + max_d2, this.size - 1), Math.min(this.editBounds?.max.y + max_d2, this.size - 1), Math.min(this.editBounds?.max.z + max_d2, this.size - 1));

    for (let x = min2.x; x < max2.x; x++) {
      for (let y = min2.y; y < max2.y; y++) {
        for (let z = min2.z; z < max2.z; z++) {
          const blockData = this.getBlock(x, y, z);
          const cornerData = this.getVoxel(x, y, z);

          if (
            !cornerData.edgesConfigs.some(
              (c) => c !== "00000000" && c !== "11111111" && c !== null
            )
          ) {
            continue;
          }

          const allSelf = cornerData.edges.every((e) => e !== null);

          axisDirection.forEach((sign) => {
            axisNames.forEach((axis) => {
              const opposedBlockData = this.getBlock(x + (axis === "x" ? sign : 0),
                y + (axis === "y" ? sign : 0),
                z + (axis === "z" ? sign : 0));

              if (opposedBlockData.v === blockData.v) {
                return;
              }

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
                  cornerData.edges[
                  cornerIndexToEdgeIndex[selfAxisCornerIndex]
                  ];

                if (selfEdge) {
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
                        this.makeEdge(selfEdge, otherEdge);
                      }

                      const farOpposedCornerData = this.getVoxel(
                        x + (axis === "x" ? sign : 0),
                        y + (axis === "y" ? sign : 0),
                        z + (axis === "z" ? sign : 0)
                      );

                      const allFar = farOpposedCornerData.edges.every(
                        (e) => e !== null
                      );

                      if (!allSelf && !allFar) {
                        if (x == 13 && y == 38 && z == 36) {
                          // console.log(cornerData);
                          // console.log(farOpposedCornerData);
                        }
                        if (
                          x == 13 &&
                          y == 37 &&
                          z == 36 &&
                          axis == "y" &&
                          sign == 1
                        ) {
                          // console.log(cornerData);
                          // console.log(cornerData.edges.every(e => e !== null))
                          // console.log(farOpposedCornerData);
                          // console.log(farOpposedCornerData.edges.every(e => e !== null));
                          // console.log(farOpposedCornerData.edges);
                        }
                        const farOpposedCornerIndex =
                          revertedSelfAxisCornerIndexes.find(
                            (i) =>
                              cornerIndexToPosition[selfAxisCornerIndex][
                              otherAxis
                              ] == cornerIndexToPosition[i][otherAxis] &&
                              cornerIndexToPosition[selfAxisCornerIndex][
                              lastAxis
                              ] !== cornerIndexToPosition[i][lastAxis]
                          )!;

                        if (farOpposedCornerIndex === undefined) {
                          throw new Error("tf2");
                        }

                        const farOpposedEdge =
                          farOpposedCornerData.edges[
                          cornerIndexToEdgeIndex[farOpposedCornerIndex]
                          ];

                        if (farOpposedEdge) {
                          this.makeEdge(selfEdge, farOpposedEdge);
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

  drawCorners() {
    for (let x = 0; x < this.size - 1; x++) {
      for (let y = 0; y < this.size - 1; y++) {
        for (let z = 0; z < this.size - 1; z++) {
          const voxel = this.getVoxel(x, y, z);
          const block = this.getBlock(x, y, z);

          if (
            voxel.edgesConfigs.some(
              (c) => c !== "00000000" && c !== "11111111" && c !== null
            )
          ) {
            if (block.v === "solid") {
              const mesh = this.cubeMesh.createInstance(`lol`);

              mesh.parent = this.rendered;

              mesh.position.x = x;
              mesh.position.y = y;
              mesh.position.z = z;
              mesh.freezeWorldMatrix();

              mesh.instancedBuffers.color = new Color4(1, 0, 0, 1);
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

  drawOwnerLines() {
    const lines: Vector3[][] = [];

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          for (let i = 0; i < 8; i++) {
            const cornerData = this.getVoxel(x, y, z);

            for (const point of cornerData.points) {
              for (const voxel of point.voxels) {
                lines.push([new Vector3(voxel.x, voxel.y, voxel.z), new Vector3(point.position.x, point.position.y, point.position.z)])
              }
            }
          }
        }
      }
    }

    const customMesh = MeshBuilder.CreateLineSystem(
      "lineSystem",
      {
        lines
      },
      this.scene
    );

    customMesh.parent = this.rendered;

    customMesh.color = Color3.Gray();
  }

  drawMeshLines() {
    if (this.linesMesh) {
      this.rendered.removeChild(this.linesMesh);
      this.scene.removeMesh(this.linesMesh);
      this.linesMesh.dispose();
      this.linesMesh = null;
    }

    this.linesMesh = MeshBuilder.CreateLineSystem(
      "lineSystem",
      {
        lines: this.meshLines.map((l) =>
          l.map((li) => new Vector3(li.position.x, li.position.y, li.position.z))
        ),
      },
      this.scene
    );

    this.linesMesh.parent = this.rendered;
    this.linesMesh.color = new Color3(0.2, 0.8, 1).scale(0.8);

    {
      const i2 = this.linesMesh.createInstance("l");
      i2.position.set(0.01, 0, 0);
      i2.parent = this.rendered;

      const i3 = this.linesMesh.createInstance("l");
      i3.position.set(0, 0.01, 0);
      i3.parent = this.rendered;

      const i4 = this.linesMesh.createInstance("l");
      i4.position.set(0, 0, 0.01);
      i4.parent = this.rendered;
    }

    {
      const i2 = this.linesMesh.createInstance("l");
      i2.position.set(-0.01, 0, 0);
      i2.parent = this.rendered;

      const i3 = this.linesMesh.createInstance("l");
      i3.position.set(0, -0.01, 0);
      i3.parent = this.rendered;

      const i4 = this.linesMesh.createInstance("l");
      i4.position.set(0, 0, -0.01);
      i4.parent = this.rendered;
    }
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
    const positions: number[] = [];
    const indices: number[] = [];

    this.triangles.forEach((t, i) => {
      positions.push(t.points[0].position.x, t.points[0].position.y, t.points[0].position.z);
      indices.push(indices.length);
      positions.push(t.points[1].position.x, t.points[1].position.y, t.points[1].position.z);
      indices.push(indices.length);
      positions.push(t.points[2].position.x, t.points[2].position.y, t.points[2].position.z);
      indices.push(indices.length);
    });

    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;

    if (!this.terrainMesh) {
      this.terrainMesh = new Mesh("custom", this.scene, {});

      this.terrainMesh.parent = this.rendered;

      //customMesh.position.set(5, 5, 5);

      vertexData.applyToMesh(this.terrainMesh, false);

      const mat = new StandardMaterial("mat", this.scene);
      mat.backFaceCulling = false;
      mat.ambientColor = new Color3(0.01, 0.01, 0.01);
      mat.disableLighting = true;
      //mat.wireframe = true;
      this.terrainMesh.material = mat;

      const shape = new PhysicsShapeMesh(
        this.terrainMesh,   // mesh from which to calculate the collisions
        this.scene   // scene of the shape
      );

      this.terrainBody = new PhysicsBody(this.terrainMesh, PhysicsMotionType.STATIC, false, this.scene);

      this.terrainBody.shape = shape;
    } else {
      vertexData.applyToMesh(this.terrainMesh, false);
      const oldShape = this.terrainBody.shape;

      this.terrainBody.shape = new PhysicsShapeMesh(
        this.terrainMesh,   // mesh from which to calculate the collisions
        this.scene   // scene of the shape
      );

      oldShape?.dispose();
    }
  }
}
