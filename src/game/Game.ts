//import "@babylonjs/core/Debug/debugLayer";
//import "@babylonjs/inspector";
import { Engine } from "@babylonjs/core/Engines/engine";
import { AxesViewer } from "@babylonjs/core/Debug/axesViewer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import HavokPhysics from "@babylonjs/havok";

import MainScene from "./scenes/MainScene/MainScene";

export class Game {
  public engine: Engine | WebGPUEngine;
  public scene: MainScene;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    // create the canvas html element and attach it to the webpage

    this.canvas = canvas;

    this.initWebGl2(); // Uncomment to use WebGL2 engine
    //this.initWebGPU(); // Comment not to use WebGPU engine
  }

  async initWebGl2(): Promise<void> {
    this.engine = new Engine(this.canvas, true, {
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
    });


    this.scene = new MainScene(this.engine);

    const gravity = new Vector3(0, -9.81, 0);
    const hk = await HavokPhysics();
    const plugin = new HavokPlugin(true, hk);

    this.scene.enablePhysics(gravity, plugin);

    this.scene.load();

    this._config();
    this._renderer();
  }

  async initWebGPU(): Promise<void> {
    const webgpu = (this.engine = new WebGPUEngine(this.canvas, {
      adaptToDeviceRatio: true,
      antialias: true,
    }));
    await webgpu.initAsync();
    this.engine = webgpu;

    this.scene = new MainScene(this.engine);

    this._config();
    this._renderer();
  }

  async _physicsPlugin(): Promise<void> {
    const gravity = new Vector3(0, -9.81, 0);
    const hk = await HavokPhysics();
    const plugin = new HavokPlugin(true, hk);
    this.scene.enablePhysics(gravity, plugin);
  }

  async _enablePhysics(): Promise<void> {
    this.scene.enablePhysics(gravity, plugin);
  }

  dispose() {
    this.scene.dispose();
    this.engine.dispose();
  }

  _fps(): void {
    const dom = document.getElementById("display-fps");

    if (dom) {
      dom.innerHTML = `${this.engine.getFps().toFixed()} fps`;
    }
  }

  async _bindEvent(): Promise<void> {
    // Imports and hide/show the Inspector
    // Works only in DEV mode to reduce the size of the PRODUCTION build
    // Comment IF statement to work in both modes
    if (import.meta.env.DEV) {
      await Promise.all([import("@babylonjs/core/Debug/debugLayer"), import("@babylonjs/inspector")]);

      window.addEventListener("keydown", (ev) => {
        // Shift+Ctrl+Alt+I
        if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
          if (this.scene.debugLayer.isVisible()) {
            this.scene.debugLayer.hide();
          } else {
            this.scene.debugLayer.show();
          }
        }
      });
    } // End of IF statement

    // resize window
    window.addEventListener("resize", () => {
      this.engine.resize();
    });

    window.onbeforeunload = () => {
      // I have tested it myself and the system will automatically remove this junk.
      this.scene.onBeforeRenderObservable.clear();
      this.scene.onAfterRenderObservable.clear();
      this.scene.onKeyboardObservable.clear();
    };
  }

  // Auxiliary Class Configuration
  _config(): void {
    // Axes
    new AxesViewer();

    // Inspector and other stuff
    this._bindEvent();
  }

  _renderer(): void {
    this.engine.runRenderLoop(() => {
      this._fps();
      this.scene.render();
    });
  }
}
