import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Scene } from "@babylonjs/core/scene";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { Terrain } from "../../voxel/Terrain";
import { Table } from "../../voxel/Table";
import { Renderer } from "../../Game";
import { AbstractEngine } from "@babylonjs/core";
import { Generator } from "@/game/voxel/Generator";
import { EraserTool } from "@/game/voxel/tools/EraserTool";
// import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";

export default class MainScene extends Scene {
  camera: ArcRotateCamera;

  constructor(engine: AbstractEngine) {
    super(engine);

    this._setCamera();
    this._setLight();
    //  this._setEnvironment(scene);

    const table = new Table(this);
    const terrain = new Terrain(this);

    const generator = new Generator();

    generator.fill(terrain);

    terrain.render();

    const tool = new EraserTool();

    tool.bind(terrain, this);
  }

  _setCamera(): void {
    this.camera = new ArcRotateCamera(
      "camera",
      Tools.ToRadians(90),
      Tools.ToRadians(80),
      100,
      Vector3.Zero(),
      this
    );
    this.camera.attachControl(this.getEngine().getRenderingCanvas(), true);
    this.camera.setTarget(Vector3.Zero());
  }

  _setLight(): void {
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), this);
    light.intensity = 0.5;
  }

  _setEnvironment() {
    this.createDefaultEnvironment({ createGround: false, createSkybox: false });
  }

  _setPipeLine(): void {
    const pipeline = new DefaultRenderingPipeline(
      "default-pipeline",
      false,
      this,
      [this.activeCamera!]
    );
    pipeline.fxaaEnabled = true;
    pipeline.samples = 4;
  }
}
