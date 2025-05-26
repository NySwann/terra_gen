import { Scene } from "@babylonjs/core/scene";
import { Color4, Mesh, MeshBuilder } from "@babylonjs/core";


type Position = { x: number, y: number, z: number };

type Configuration = [number, number, number, number, number, number, number, number];
type ConfigurationStr = string;

export const configIndexToEdgePositions: { [key: number]: Position[] } =
{
}

export const cornerIndexToPosition = [
  { x: 0, y: 0, z: 0 }, // 
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 1, y: 0, z: 1 },
  { x: 0, y: 1, z: 0 },
  { x: 1, y: 1, z: 0 },
  { x: 0, y: 1, z: 1 },
  { x: 1, y: 1, z: 1 },
]

export const cornerIndexToEdgeIndex = [
 7, // 000 -> 111
 6, // 100 -> 011
 5, // 001 -> 110
 4, // 101 -> 010
 3, // 010 -> 101
 2, // 110 -> 001
 1, // 011 -> 100
 0, // 111 -> 000
]

const cornerIndexToGrab = [
  { x: -0.25, y: -0.25, z: -0.25 },
  { x: 0.25, y: -0.25, z: -0.25 },
  { x: -0.25, y: -0.25, z: 0.25 },
  { x: 0.25, y: -0.25, z: 0.25 },
  { x: -0.25, y: 0.25, z: -0.25 },
  { x: 0.25, y: 0.25, z: -0.25 },
  { x: -0.25, y: 0.25, z: 0.25 },
  { x: 0.25, y: 0.25, z: 0.25 },
]

const balancedConfigurations = [
  "11110000",
  "00001111",
  "10101010",
  "01010101",
  "11001100",
  "00110011"
]

export const configIndexToStr: ConfigurationStr[] = [];

export class Table {
  scene: Scene;
  selectedConfig: number;
  sphereMesh: Mesh;

  constructor(scene: Scene) {
    this.scene = scene;

    MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, this.scene);

    this.sphereMesh = MeshBuilder.CreateSphere("sphere", { diameter: 0.4, segments: 4 }, this.scene);

    this.sphereMesh.registerInstancedBuffer("color", 4);
    this.sphereMesh.instancedBuffers.color = new Color4(0.2, 0.6, 0.4, 1.0);

    this.generateConfig(1, 1, [0, 0, 0, 0, 0, 0, 0, 0]);
    this.generateConfig(1, 2, [0, 0, 0, 0, 0, 0, 0, 0]);
    this.generateConfig(1, 3, [0, 0, 0, 0, 0, 0, 0, 0]);
    this.generateConfig(1, 4, [0, 0, 0, 0, 0, 0, 0, 0]);

    for (const c of configIndexToStr) {
      //console.log(c);

      this.generateEdges(configIndexToStr.indexOf(c));
    }

    //console.log(configIndexToStr.length);

    this.selectedConfig = configIndexToStr.findIndex(d => d == "00110011");

    //console.log(this.selectedConfig);

    this.visualize();
  }

  generateConfig(depth: number, target: number, prev: Configuration) {
    for (let i = 0; i < 8; i++) {
      const config: Configuration = [...prev];

      if (config[i] !== 1) {
        config[i] = 1;
      }

      if (depth === target) {
        const c = config.join("");

        if (!configIndexToStr.includes(c)) {
          configIndexToStr.push(c);
        }
      } else {
        this.generateConfig(depth + 1, target, config);
      }
    }
  }

  deepSearchClusters(selectedConfig: number, currentCorner: number, recordedCorner: number[]) {
    const currentPosition = cornerIndexToPosition[currentCorner];

    const alongX = { x: currentPosition.x === 0 ? 1 : 0, y: currentPosition.y, z: currentPosition.z };
    const alongXIndex = cornerIndexToPosition.findIndex(p => p.x === alongX.x && p.y == alongX.y && p.z == alongX.z);

    if (!recordedCorner.includes(alongXIndex)) {
      const config = configIndexToStr[selectedConfig];

      if (config[alongXIndex] === '1') {
        recordedCorner.push(alongXIndex);

        this.deepSearchClusters(selectedConfig, alongXIndex, recordedCorner);
      }
    }

    const alongY = { x: currentPosition.x, y: currentPosition.y  === 0 ? 1 : 0, z: currentPosition.z };
    const alongYIndex = cornerIndexToPosition.findIndex(p => p.x === alongY.x && p.y == alongY.y && p.z == alongY.z);

    if (!recordedCorner.includes(alongYIndex)) {
      const config = configIndexToStr[selectedConfig];

      if (config[alongYIndex] === '1') {
        recordedCorner.push(alongYIndex);

        this.deepSearchClusters(selectedConfig, alongYIndex, recordedCorner);
      }
    }

    const alongZ = { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z === 0 ? 1 : 0};
    const alongZIndex = cornerIndexToPosition.findIndex(p => p.x === alongZ.x && p.y == alongZ.y && p.z == alongZ.z);

    if (!recordedCorner.includes(alongZIndex)) {
      const config = configIndexToStr[selectedConfig];

      if (config[alongZIndex] === '1') {
        recordedCorner.push(alongZIndex);

        this.deepSearchClusters(selectedConfig, alongZIndex, recordedCorner);
      }
    }
  }

  generateEdges(selectedConfig: number) {
    const config = configIndexToStr[selectedConfig];

    // corner index
    for (let x = 0; x < 8; x++) {
      if (config[x] === '1') {
        const cluster = [x];

        let edgePosition: Position;

        if (balancedConfigurations.includes(config)) {
          edgePosition = {x: 0, y: 0, z: 0};
        } else {
          this.deepSearchClusters(selectedConfig, x, cluster);

          const clusterGrabs = cluster.map(i => cornerIndexToGrab[i]);

          edgePosition = {
            x: clusterGrabs.reduce((acc, v) => acc + v.x, 0) / clusterGrabs.length,
            y: clusterGrabs.reduce((acc, v) => acc + v.y, 0) / clusterGrabs.length,
            z: clusterGrabs.reduce((acc, v) => acc + v.z, 0) / clusterGrabs.length
          }
        }

        if (!configIndexToEdgePositions[selectedConfig]) {
          configIndexToEdgePositions[selectedConfig] = [null, null, null, null, null, null, null, null];
        }

        configIndexToEdgePositions[selectedConfig][x] = edgePosition;
      }
    }
  }

  visualize() {
    if (this.selectedConfig == -1) {
      console.error("-1");
      return;
    }

    const config = configIndexToStr[this.selectedConfig];

    console.log(config);

    for (let x = 0; x < 8; x++) {
      const mesh = this.sphereMesh.createInstance(`lol`);

      const position = cornerIndexToPosition[x];

      mesh.position.x = position.x;
      mesh.position.y = position.y;
      mesh.position.z = position.z;

      mesh.freezeWorldMatrix();

      mesh.instancedBuffers.color = config[x] === '1' ? new Color4(1, 1, 1, 1) : new Color4(0, 0, 1, 1);

      const ce = configIndexToEdgePositions[this.selectedConfig];

      if (ce && config[x] === '1') {
        const e = ce[x];

        if (e) {
          const mesh = this.sphereMesh.createInstance(`lol`);

          mesh.position.x = 0.5 + e.x;
          mesh.position.y = 0.5 + e.y;
          mesh.position.z = 0.5 + e.z;

          mesh.freezeWorldMatrix();

          mesh.instancedBuffers.color = new Color4(0, 1, 0, 0);
        }
      }
    }
  }
}
