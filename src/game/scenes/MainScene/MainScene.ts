// import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";

import {
  Scene,
  ArcRotateCamera,
  AbstractEngine,
  Tools,
  Vector3,
  HemisphericLight,
  DefaultRenderingPipeline,
  Color4,
  PhysicsAggregate,
  MeshBuilder,
  PhysicsShapeType,
} from "@babylonjs/core";
import { Generator } from "../../voxel/Generator";
import { Terrain } from "../../voxel/Terrain";
import { Table } from "../../voxel/Table";
import { EraserTool } from "../../voxel/tools/EraserTool";
import type { Tool } from "../../voxel/tools/tool";

export default class MainScene extends Scene {
  camera: ArcRotateCamera;
  tool: Tool;
  terrain: Terrain;

  constructor(engine: AbstractEngine) {
    super(engine);

    this.clearColor = new Color4(0.0, 0.0, 0.06, 1.0);

    this._setCamera();
    this._setLight();

    const table = new Table(this);
    const terrain = new Terrain(this);

    this.terrain = terrain;

    const tool = new EraserTool();

    tool.bind(terrain, this);

    this.tool = tool;
  }

  load(): void {
    const generator = new Generator();

    generator.fill(this.terrain);

    this.terrain.compute();
    this.terrain.render();
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
