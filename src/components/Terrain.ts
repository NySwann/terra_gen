import { Scene } from "@babylonjs/core/scene";
import { mkSimplexNoise } from "../perlin";
import { Color3, Color4, Mesh, MeshBuilder, NodeMaterial } from "@babylonjs/core";
import { SimpleMaterial } from "@babylonjs/materials";
import { configIndexToEdgePositions, configIndexToStr, cornerIndexToPosition } from "./Table";


interface EdgePos {
  x: number;
  y: number;
  z: number;
}

type Material = "gaz" | "solid"; 

interface Block { 
  v: Material;
  aBottomRightEdge: EdgePos | null;
  aBottomLeftEdge: EdgePos | null;
  aTopRightEdge: EdgePos | null;
  aTopLeftEdge: EdgePos | null;
  bBottomRightEdge: EdgePos | null;
  bBoottomLeftEdge: EdgePos | null;
  bTopRightEdge: EdgePos | null;
  bTopLeftEdge: EdgePos | null;
}

export class Terrain {
  scene: Scene;
  size: number;
  data: Block[][][];
  opaqueSphereMesh: Mesh;
  transparentSphereMesh: Mesh;

  constructor(scene: Scene) {
    this.scene = scene;

    this.size = 40;
    this.data = [];

    MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, this.scene);

    this.opaqueSphereMesh = MeshBuilder.CreateSphere("sphere", { diameter: 0.8, segments: 4 }, this.scene);
    this.opaqueSphereMesh.registerInstancedBuffer("color", 4);
    this.opaqueSphereMesh.instancedBuffers.color = new Color4(0.2,0.6,0.4,1.0);

    this.transparentSphereMesh = MeshBuilder.CreateSphere("sphere", { diameter: 0.8, segments: 4 }, this.scene);
    this.transparentSphereMesh.hasVertexAlpha = true;
    this.transparentSphereMesh.registerInstancedBuffer("color", 4);
    this.transparentSphereMesh.instancedBuffers.color = new Color4(0.2,0.6,0.4,1.0);

    this.generate();
    this.computeEdges();
    this.visualize();
  }

  generate() {
    const noise = mkSimplexNoise(Math.random);

    for (let x = 0; x < this.size; x++)
    {
      const rowx: Block[][] = [];

      for (let y = 0; y < this.size; y++)
      {
        const rowy: Block[] = [];

        for (let z = 0; z < this.size; z++)
        {
          const v = noise.noise3D(x / 16, y / 16, z / 16) + noise.noise3D(x / 32, y / 32, z / 32) >= 0.5 ? "solid" : "gaz";
          // const v = Math.random() <= 0.3 ? "solid" : "gaz";
         // const v = (x ==10) ? "solid" : "gaz";

          rowy.push({
            v: v,
            aBottomRightEdge: null,
            aBottomLeftEdge: null,
            aTopRightEdge: null,
            aTopLeftEdge: null,
            bBottomRightEdge: null,
            bBoottomLeftEdge: null,
            bTopRightEdge: null,
            bTopLeftEdge: null,
          }); 
        }

        rowx.push(rowy);
      }

      this.data.push(rowx);
    }
  }

  computeEdges() {
    console.log("computeEdges");
    for (let x = 0; x < this.size - 1; x++)
    {
      for (let y = 0; y < this.size - 1; y++)
      {
        for (let z = 0; z < this.size - 1; z++)
        {
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
              // console.log("found");
              // console.log(configIndexToEdgePositions[configIndex]);

              for (let i = 0; i < 8; i++) {
                const cornerPos = cornerIndexToPosition[i];

                // console.log(cornerPos);

                const corner = this.data[x + cornerPos.x][y + cornerPos.y][z + cornerPos.z];

                if (corner.v === "solid") {
                  console.log(i)
                  const edge = configIndexToEdgePositions[configIndex]?.[i];


                  if (edge) {
                    const mesh = this.opaqueSphereMesh.createInstance(`lol`)
            
                    mesh.position.x = x + 0.5 + edge.x;
                    mesh.position.y = y + 0.5 + edge.y;
                    mesh.position.z = z + 0.5 + edge.z;
                    mesh.freezeWorldMatrix();

                    mesh.instancedBuffers.color =  new Color4(1, 1, 0, 1);
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

  visualize() {
    for (let x = 0; x < this.size; x++)
    {
      for (let y = 0; y < this.size; y++)
      {
        for (let z = 0; z < this.size; z++)
        {
          const mesh = this.transparentSphereMesh.createInstance(`lol`)
      
          mesh.position.x = x;
          mesh.position.y = y;
          mesh.position.z = z;
          mesh.freezeWorldMatrix();

          mesh.instancedBuffers.color = this.data[x][y][z].v === "solid" ? new Color4(1, 1, 1, .4) : new Color4(0, 0, 1, .01) ;
        }
      }
    }
  }

  draw() {
    const ctx = this.context;

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let x = 0; x < this.width; x++)
    {
      for (let y = 0; y < this.height; y++)
      {
        ctx.fillStyle = this.data[x][y].v > 0 ? "red" : "blue";
        ctx.beginPath();
        ctx.arc((x)*(ctx.canvas.width / this.width), (y)*(ctx.canvas.height / this.height), dotSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    for (let x = 1; x < this.width - 1; x++)
    {
      for (let y = 1; y < this.height - 1; y++)
      {
        const center = this.data[x][y];

        const left = this.data[x - 1][y];
        const right = this.data[x + 1][y];

        const top = this.data[x][y-1];
        const bottom = this.data[x][y+1];

        const topLeftEdge = center.topLeftEdge;
        const bottomLeftEdge = center.bottomLeftEdge;

        const topRightEdge = center.topRightEdge;
        const bottomRightEdge = center.bottomRightEdge;
        
        // const bottomLeft = edgeData[x][y - 1];
        // const bottomRight = edgeData[x][y];

        if (center.v > 0)
        {
          if (topLeftEdge) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc((x + topLeftEdge.x)*(ctx.canvas.width / this.width), (y + topLeftEdge.y)*(ctx.canvas.height / this.height), 2, 0, 2 * Math.PI);
            ctx.fill();
          }
          if (bottomLeftEdge) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc((x + bottomLeftEdge.x)*(ctx.canvas.width / this.width), (y + bottomLeftEdge.y)*(ctx.canvas.height / this.height), 2, 0, 2 * Math.PI);
            ctx.fill();
          }
          if (topLeftEdge && bottomLeftEdge && left.v <= 0)
          {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo((x + topLeftEdge.x)*(ctx.canvas.width / this.width), (y + topLeftEdge.y)*(ctx.canvas.height / this.height));
            ctx.lineTo((x + bottomLeftEdge.x)*(ctx.canvas.width / this.width), (y + bottomLeftEdge.y)*(ctx.canvas.height / this.height));
            ctx.stroke();
          }
          if (topRightEdge) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc((x + topRightEdge.x)*(ctx.canvas.width / this.width), (y + topRightEdge.y)*(ctx.canvas.height / this.height), 2, 0, 2 * Math.PI);
            ctx.fill();
          }
          if (bottomRightEdge) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc((x + bottomRightEdge.x)*(ctx.canvas.width / this.width), (y + bottomRightEdge.y)*(ctx.canvas.height / this.height), 2, 0, 2 * Math.PI);
            ctx.fill();
          }

          if (topRightEdge && bottomRightEdge && right.v <= 0)
          {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo((x + topRightEdge.x)*(ctx.canvas.width / this.width), (y + topRightEdge.y)*(ctx.canvas.height / this.height));
            ctx.lineTo((x + bottomRightEdge.x)*(ctx.canvas.width / this.width), (y + bottomRightEdge.y)*(ctx.canvas.height / this.height));
            ctx.stroke();
          }

          if (topRightEdge && topLeftEdge && top.v <= 0)
          {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo((x + topRightEdge.x)*(ctx.canvas.width / this.width), (y + topRightEdge.y)*(ctx.canvas.height / this.height));
            ctx.lineTo((x + topLeftEdge.x)*(ctx.canvas.width / this.width), (y + topLeftEdge.y)*(ctx.canvas.height / this.height));
            ctx.stroke();
          }

          if (bottomLeftEdge && bottomRightEdge && bottom.v <= 0)
          {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo((x + bottomLeftEdge.x)*(ctx.canvas.width / this.width), (y + bottomLeftEdge.y)*(ctx.canvas.height / this.height));
            ctx.lineTo((x + bottomRightEdge.x)*(ctx.canvas.width / this.width), (y + bottomRightEdge.y)*(ctx.canvas.height / this.height));
            ctx.stroke();
          }
        }
      }
    }
  }
}
