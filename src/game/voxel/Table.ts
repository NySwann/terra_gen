import { Scene } from "@babylonjs/core/scene";
import { Color4, Mesh, MeshBuilder } from "@babylonjs/core";
import fontData from "../droid.json";
import {
  precomputed_configIndexToEdgePositions,
  precomputed_configIndexToStr,
} from "./TableComputed";

interface Position {
  x: number;
  y: number;
  z: number;
}

type Configuration = [
  number,
    number,
  number,
  number,
  number,
  number,
  number,
  number
];
type ConfigurationStr = string;

export let configIndexToStr: ConfigurationStr[] = [];
export let configIndexToEdgePositions: Record<number, (Position | null)[]> = {};

export const cornerIndexToPosition = [
  { x: 0, y: 0, z: 0 }, //
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 1, y: 0, z: 1 },
  { x: 0, y: 1, z: 0 },
  { x: 1, y: 1, z: 0 },
  { x: 0, y: 1, z: 1 },
  { x: 1, y: 1, z: 1 },
];

export const cornerIndexToEdgeIndex = [
  7, // 000 -> 111
  6, // 100 -> 011
  5, // 001 -> 110
  4, // 101 -> 010
  3, // 010 -> 101
  2, // 110 -> 001
  1, // 011 -> 100
  0, // 111 -> 000
];

const cornerIndexToGrab = [
  { x: -0.25, y: -0.25, z: -0.25 },
  { x: 0.25, y: -0.25, z: -0.25 },
  { x: -0.25, y: -0.25, z: 0.25 },
  { x: 0.25, y: -0.25, z: 0.25 },
  { x: -0.25, y: 0.25, z: -0.25 },
  { x: 0.25, y: 0.25, z: -0.25 },
  { x: -0.25, y: 0.25, z: 0.25 },
  { x: 0.25, y: 0.25, z: 0.25 },
];

const balancedConfigurations = [
  "11110000",
  "00001111",
  "10101010",
  "01010101",
  "11001100",
  "00110011",

  "11101000",
  "00010111",
  "11010100",
];

export class Table {
  scene: Scene;
  debugConfig: number;
  sphereMesh: Mesh;

  constructor(scene: Scene) {
    this.scene = scene;

    //MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, this.scene);

    this.sphereMesh = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 0.4, segments: 4 },
      this.scene
    );

    this.sphereMesh.registerInstancedBuffer("color", 4);
    this.sphereMesh.instancedBuffers.color = new Color4(0.2, 0.6, 0.4, 1.0);

    // configIndexToStr = precomputed_configIndexToStr;
    // configIndexToEdgePositions = precomputed_configIndexToEdgePositions;

    configIndexToStr = [];
    configIndexToEdgePositions = {};

    this.generateConfig(1, 1, [0, 0, 0, 0, 0, 0, 0, 0]);
    this.generateConfig(1, 2, [0, 0, 0, 0, 0, 0, 0, 0]);
    this.generateConfig(1, 3, [0, 0, 0, 0, 0, 0, 0, 0]);
    this.generateConfig(1, 4, [0, 0, 0, 0, 0, 0, 0, 0]);
    this.generateConfig(1, 5, [0, 0, 0, 0, 0, 0, 0, 0]);
    this.generateConfig(1, 6, [0, 0, 0, 0, 0, 0, 0, 0]);
    this.generateConfig(1, 7, [0, 0, 0, 0, 0, 0, 0, 0]);

    this.debugConfig = configIndexToStr.findIndex((d) => d == "11010110");

    for (const c of configIndexToStr) {
      //console.log(c);

      this.generateEdges(configIndexToStr.indexOf(c));
    }

    //console.log(JSON.stringify(configIndexToStr, null, 2));
    //console.log(JSON.stringify(configIndexToEdgePositions, null, 2));

    //console.log(configIndexToStr.length);

    //console.log(this.selectedConfig);

    this.visualize();

    this.sphereMesh.position.set(100, 100, 100);
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

  deepSearchClusters(
    of: string,
    selectedConfig: number,
    currentCorner: number,
    recordedCorner: number[]
  ) {
    const currentPosition = cornerIndexToPosition[currentCorner];

    const alongX = {
      x: currentPosition.x === 0 ? 1 : 0,
      y: currentPosition.y,
      z: currentPosition.z,
    };
    const alongXIndex = cornerIndexToPosition.findIndex(
      (p) => p.x === alongX.x && p.y == alongX.y && p.z == alongX.z
    );

    if (!recordedCorner.includes(alongXIndex)) {
      const config = configIndexToStr[selectedConfig];

      if (config[alongXIndex] === of) {
        recordedCorner.push(alongXIndex);

        this.deepSearchClusters(
          of,
          selectedConfig,
          alongXIndex,
          recordedCorner
        );
      }
    }

    const alongY = {
      x: currentPosition.x,
      y: currentPosition.y === 0 ? 1 : 0,
      z: currentPosition.z,
    };
    const alongYIndex = cornerIndexToPosition.findIndex(
      (p) => p.x === alongY.x && p.y == alongY.y && p.z == alongY.z
    );

    if (!recordedCorner.includes(alongYIndex)) {
      const config = configIndexToStr[selectedConfig];

      if (config[alongYIndex] === of) {
        recordedCorner.push(alongYIndex);

        this.deepSearchClusters(
          of,
          selectedConfig,
          alongYIndex,
          recordedCorner
        );
      }
    }

    const alongZ = {
      x: currentPosition.x,
      y: currentPosition.y,
      z: currentPosition.z === 0 ? 1 : 0,
    };
    const alongZIndex = cornerIndexToPosition.findIndex(
      (p) => p.x === alongZ.x && p.y == alongZ.y && p.z == alongZ.z
    );

    if (!recordedCorner.includes(alongZIndex)) {
      const config = configIndexToStr[selectedConfig];

      if (config[alongZIndex] === of) {
        recordedCorner.push(alongZIndex);

        this.deepSearchClusters(
          of,
          selectedConfig,
          alongZIndex,
          recordedCorner
        );
      }
    }
  }

  generateEdges(selectedConfig: number) {
    const config = configIndexToStr[selectedConfig];

    const count1 = config.split("").filter((c) => c === "1").length;
    const count0 = config.split("").filter((c) => c === "0").length;
    const of = count1 <= count0 ? "1" : "0";

    if (selectedConfig === this.debugConfig) {
      console.log(config);
      console.log(of);
      console.log("allo merde");
    }

    // corner index
    for (let x = 0; x < 8; x++) {
      const cluster = [x];

      let edgePosition: Position | null = null;

      this.deepSearchClusters(config[x], selectedConfig, x, cluster);

      let f = 0;

      if (
        count1 == 5 &&
        [0, 1, 2, 3, 4, 5, 6, 7].some((i) => {
          const cluster2 = [i];
          this.deepSearchClusters(config[i], selectedConfig, i, cluster2);

          if (config[i] === "1" && cluster2.length === 1) {
            f = i;
            return true;
          }
          return false;
        })
      ) {
        if (cluster.length === 1 && config[x] === "1") {
          edgePosition = {
            x: cornerIndexToGrab[cluster[0]].x * 1.5,
            y: cornerIndexToGrab[cluster[0]].y * 1.5,
            z: cornerIndexToGrab[cluster[0]].z * 1.5,
          };
        } else if (cluster.length === 1 && config[x] === "0") {
          edgePosition = { x: 0, y: 0, z: 0 };
        } else if (cluster.length === 4 && config[x] === "1") {
          edgePosition = { x: 0, y: 0, z: 0 };
        }
      } else if (config[x] === of) {
        if (balancedConfigurations.includes(config) || cluster.length === 4) {
          edgePosition = { x: 0, y: 0, z: 0 };
        } else if (cluster.length === 1) {
          edgePosition = {
            x: cornerIndexToGrab[cluster[0]].x * 1.5,
            y: cornerIndexToGrab[cluster[0]].y * 1.5,
            z: cornerIndexToGrab[cluster[0]].z * 1.5,
          };
        } else if (config[x] === of) {
          const clusterGrabs = cluster.map((i) => cornerIndexToGrab[i]);

          edgePosition = {
            x:
              clusterGrabs.reduce((acc, v) => acc + v.x, 0) /
              clusterGrabs.length,
            y:
              clusterGrabs.reduce((acc, v) => acc + v.y, 0) /
              clusterGrabs.length,
            z:
              clusterGrabs.reduce((acc, v) => acc + v.z, 0) /
              clusterGrabs.length,
          };
        }
      }

      if (selectedConfig === this.debugConfig) {
        console.log(edgePosition);
      }

      if (edgePosition) {
        if (!configIndexToEdgePositions[selectedConfig]) {
          configIndexToEdgePositions[selectedConfig] = [
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ];
        }

        configIndexToEdgePositions[selectedConfig][x] = edgePosition;
      }
    }
  }

  visualize() {
    if (this.debugConfig == -1) {
      console.error("-1");
      return;
    }

    const p = { x: 0.0, y: 0.0, z: 50.0 };

    const config = configIndexToStr[this.debugConfig];

    console.log(config);

    for (let x = 0; x < 8; x++) {
      const mesh = this.sphereMesh.createInstance(`lol`);

      const position = cornerIndexToPosition[x];

      mesh.position.x = position.x + p.x;
      mesh.position.y = position.y + p.y;
      mesh.position.z = position.z + p.z;

      mesh.freezeWorldMatrix();

      mesh.instancedBuffers.color =
        config[x] === "1" ? new Color4(1, 1, 1, 1) : new Color4(0, 0, 1, 1);

      const ce = configIndexToEdgePositions[this.debugConfig];

      if (ce) {
        const e = ce[x];

        if (e) {
          const mesh = this.sphereMesh.createInstance(`lol`);

          mesh.position.x = 0.5 + e.x + p.x;
          mesh.position.y = 0.5 + e.y + p.y;
          mesh.position.z = 0.5 + e.z + p.z;

          mesh.freezeWorldMatrix();

          mesh.instancedBuffers.color = new Color4(0, 1, 0, 0);
        }
      }
    }
  }
}
