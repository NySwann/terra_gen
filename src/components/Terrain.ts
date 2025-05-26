import { Scene } from "@babylonjs/core/scene";
import { mkSimplexNoise } from "../perlin";
import { Color3, Color4, Mesh, MeshBuilder, NodeMaterial } from "@babylonjs/core";
import { SimpleMaterial } from "@babylonjs/materials";
import { configIndexToEdgePositions, configIndexToStr, cornerIndexToEdgeIndex, cornerIndexToPosition } from "./Table";


interface Position {
  x: number;
  y: number;
  z: number;
}

type Material = "gaz" | "solid";

interface Block {
  v: Material;
  edges: [Position | null, Position | null, Position | null, Position | null, Position | null, Position | null, Position | null, Position | null]
}

export class Terrain {
  scene: Scene;
  size: number;
  data: Block[][][];
  opaqueSphereMesh: Mesh;
  transparentSphereMesh: Mesh;
  triangles: Position[];

  constructor(scene: Scene) {
    this.scene = scene;

    this.size = 40;
    this.data = [];

    MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, this.scene);

    this.opaqueSphereMesh = MeshBuilder.CreateSphere("sphere", { diameter: 0.6, segments: 1 }, this.scene);
    this.opaqueSphereMesh.registerInstancedBuffer("color", 4);
    this.opaqueSphereMesh.instancedBuffers.color = new Color4(0.2, 0.6, 0.4, 1.0);

    this.transparentSphereMesh = MeshBuilder.CreateSphere("sphere", { diameter: 0.6, segments: 1 }, this.scene);
    this.transparentSphereMesh.hasVertexAlpha = true;
    this.transparentSphereMesh.registerInstancedBuffer("color", 4);
    this.transparentSphereMesh.instancedBuffers.color = new Color4(0.2, 0.6, 0.4, 1.0);

    this.generate();
    this.computeEdges();
    //this.drawCorners();
    this.drawEdges();
  }

  generate() {
    const noise = mkSimplexNoise(Math.random);

    for (let x = 0; x < this.size; x++) {
      const rowx: Block[][] = [];

      for (let y = 0; y < this.size; y++) {
        const rowy: Block[] = [];

        for (let z = 0; z < this.size; z++) {
          const v = noise.noise3D(x / 16, y / 16, z / 16) + noise.noise3D(x / 32, y / 32, z / 32) >= 0.5 ? "solid" : "gaz";
          // const v = Math.random() <= 0.3 ? "solid" : "gaz";
          //const v = (x ==10) ? "solid" : "gaz";
          //const v = (x ==10 && y==10 && z==10) ? "solid" : "gaz";

          rowy.push({
            v: v,
            edges: [null, null, null, null, null, null, null, null]
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

          const totalGaz = [aTopLeft.v, aBottomLeft.v, aTopRight.v, aBottomRight.v, bTopLeft.v, bBottomLeft.v, bTopRight.v, bBottomRight.v].filter(v => v === "gaz").length;
          const totalSolid = [aTopLeft.v, aBottomLeft.v, aTopRight.v, aBottomRight.v, bTopLeft.v, bBottomLeft.v, bTopRight.v, bBottomRight.v].filter(v => v === "solid").length;

          const main = (totalGaz >= totalSolid) ? "solid" : "gaz";

          const config = [aTopLeft.v, aTopRight.v, bTopLeft.v, bTopRight.v, aBottomLeft.v, aBottomRight.v, bBottomLeft.v, bBottomRight.v].map(v => v === main ? "1" : "0").join("");

          if (config !== "00000000") {
            // console.log({x, y, z});
            // console.log(config);
            //console.log(configIndexToStr);
          }
          const configIndex = configIndexToStr.findIndex(v => v === config);

          if (configIndex >= 0) {
            const configuration = configIndexToEdgePositions?.[configIndex];
            // console.log("found");
            // console.log(configIndexToEdgePositions[configIndex]);

            for (let i = 0; i < 8; i++) {
              const cornerPos = cornerIndexToPosition[i];

              // console.log(cornerPos);

              const corner = this.data[x + cornerPos.x][y + cornerPos.y][z + cornerPos.z];

              if (corner.v === "solid" || corner.v === "gaz") {
                console.log(i)

                const edge = configuration?.[i];

                if (edge) {
                  // const mesh = this.opaqueSphereMesh.createInstance(`lol`)

                  // mesh.position.x = x + 0.5 + edge.x;
                  // mesh.position.y = y + 0.5 + edge.y;
                  // mesh.position.z = z + 0.5 + edge.z;
                  // mesh.freezeWorldMatrix();

                  // mesh.instancedBuffers.color =  new Color4(1, 1, 0, 1);

                  corner.edges[cornerIndexToEdgeIndex[i]] = { x: edge.x, y: edge.y, z: edge.z };
                } else {
                  console.log("no edge");
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
          const mesh = this.transparentSphereMesh.createInstance(`lol`)

          mesh.position.x = x;
          mesh.position.y = y;
          mesh.position.z = z;
          mesh.freezeWorldMatrix();

          mesh.instancedBuffers.color = this.data[x][y][z].v === "solid" ? new Color4(1, 1, 1, .4) : new Color4(0, 0, 1, .01);
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
              const mesh = this.opaqueSphereMesh.createInstance(`lol`)

              mesh.position.x = x + (0.5 - cornerPos.x) + edgePos.x;
              mesh.position.y = y + (0.5 - cornerPos.y) + edgePos.y;
              mesh.position.z = z + (0.5 - cornerPos.z) + edgePos.z;
              mesh.freezeWorldMatrix();

              mesh.instancedBuffers.color = new Color4(1, 1, 0, 1);
            }
          }
        }
      }
    }
  }

  computeTriangles() {
    console.log("computeEdges");
    for (let x = 1; x < this.size - 1; x++) {
      for (let y = 1; y < this.size - 1; y++) {
        for (let z = 1; z < this.size - 1; z++) {
          const corner = this.data[x][y][z];

          for (let i = 0; i < 8; i++) {
            const edge = corner.edges[i];

            
          }
        }
      }
    }
  }
}
