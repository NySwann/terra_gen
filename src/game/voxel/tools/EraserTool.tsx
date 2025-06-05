import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Matrix,
  TransformNode,
  Mesh,
  PhysicsAggregate,
  PhysicsShapeType,
} from "@babylonjs/core";
import { Terrain } from "../Terrain";
import MainScene from "../../scenes/MainScene/MainScene";
import { amanatidesWooAlgorithm } from "../ray";
import type { Tool } from "./tool";
import type { ReactNode } from "react";
import { NumberInput, Stack } from "@mantine/core";
import { createStore, type Store } from "../../../stores/store";
import { useStoreValue } from "../../../hooks/useStore";
import { type EraserToolOptions, EraserToolControl } from "./EraserToolControl";

export class EraserTool implements Tool {
  optionsStore: Store<EraserToolOptions> = createStore({ size: 0.1 });
  rendered: TransformNode;
  selectorMesh: Mesh;
  control: ReactNode;

  constructor() {
    this.control = <EraserToolControl optionsStore={this.optionsStore} />;
  }

  bind(terrain: Terrain, scene: MainScene) {
    console.log("bind tool");

    this.rendered = new TransformNode("root2", scene);

    let lastPick = new Date();
    // in voxel grid space
    let lastPos: Vector3 | null = null;

    const diameter = 1.8;

    console.log(diameter)

    const selectorMesh = MeshBuilder.CreateSphere("sphere", { diameter }, scene);
    selectorMesh.isPickable = false;
    const selectorMeshMaterial = new StandardMaterial("", scene);
    selectorMeshMaterial.alpha = 0.4;
    selectorMeshMaterial.emissiveColor = Color3.White();
    selectorMeshMaterial.disableLighting = true;
    selectorMesh.material = selectorMeshMaterial;
    selectorMesh.parent = this.rendered;
    selectorMesh.renderOutline = true;

    this.selectorMesh = selectorMesh;

    scene.onPointerMove = (e) => {
      if (new Date().getTime() - lastPick.getTime() < 16) {
        return;
      }

      lastPick = new Date();

      const ray = scene.createPickingRay(
        scene.pointerX,
        scene.pointerY,
        Matrix.Identity(),
        scene.camera
      );

      // const hit = scene.pickWithRay(ray);

      // if (hit?.pickedPoint) {
      //   const position = new Vector3(Math.round(hit.pickedPoint?.x - this.rendered.position.x), Math.round(hit.pickedPoint?.y - this.rendered.position.y), Math.round(hit.pickedPoint?.z - this.rendered.position.z));

      //   lastPos = position;

      //   //console.log(position);

      //   //selectorMesh.position.set(position.x, position.y, position.z);
      // }

      // const cameraViewport = camera.viewport;
      // const viewport = cameraViewport.toGlobal(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight());

      // // Moving coordinates to local viewport world
      // const x = scene.pointerX / scene.getEngine().getHardwareScalingLevel() - viewport.x;
      // const y = scene.pointerY / scene.getEngine().getHardwareScalingLevel() - (scene.getEngine().getRenderHeight() - viewport.y - viewport.height);

      // const origin = Vector3.Unproject(
      //                   new Vector3(x, y, 0),
      //       	          scene.getEngine().getRenderWidth(),
      //                   scene.getEngine().getRenderHeight(),
      //                   Matrix.Identity(), scene.getViewMatrix(),
      //                   scene.getProjectionMatrix());

      // selectorMesh.position.set(origin.x, origin.y, origin.z);

      const owner = terrain.gridRoot;

      owner.computeWorldMatrix();
      const matrix = Matrix.Identity();
      owner.getWorldMatrix().invertToRef(matrix);
      const o = Vector3.TransformCoordinates(ray.origin, matrix);
      //selectorMesh.position.set(o.x, o.y, o.z);

      //console.log(o);

      const d = Vector3.TransformNormal(ray.direction, matrix);
      const far = o.add(d.scale(10));
      //selectorMesh2.position.set(far.x, far.y, far.z);

      //const wm = this.rendered.getWorldMatrix();

      // wm.invert();

      // const o = Vector3.TransformCoordinates(origin, wm);

      // //selectorMesh.position.set(o.x, o.y, o.z);

      // const d = Vector3.TransformNormal(ray.direction, wm);

      // si on tire en -0.4, on veut le voxel en 0
      const rayz = {
        origin: o.subtract(new Vector3(0.5, 0.5, 0.5)),
        direction: d,
      };

      const getVoxel = (x: number, y: number, z: number) => {
        //console.log(x, y, z);

        const block = terrain.getBlock(x, y, z);

        if (!block) {
          return false;
        }

        return block.v === "solid";
      };

      // ici l'algo pense que les voxels demarrent en [1] alors qu'ils sont VISUELLEMENT en [-0.5] mais leurs indices sont [0]
      const hitz = amanatidesWooAlgorithm(
        rayz,
        terrain.size,
        getVoxel,
        0.0,
        1.0
      );

      if (hitz) {
        lastPos = hitz;

        //console.log(lastPos);

        // back to world space

        const pos = Vector3.TransformCoordinates(
          lastPos,
          owner.getWorldMatrix()
        );

        this.selectorMesh.position.set(pos.x, pos.y, pos.z);
      }
    };

    scene.onPointerDown = (e) => {
      //console.log(lastPos);
      if (e.button == 1) {
        const mesh = MeshBuilder.CreateSphere("sphere", { diameter: 2, segments: 32 }, scene);

        mesh.position.y = 50;
        mesh.position.x = Math.random() * 50 - 25;
        mesh.position.z = Math.random() * 50 - 25;

        new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, { mass: 1, restitution: 0.75 }, scene);
      }

      if (e.button === 0 && lastPos) {
        console.log(lastPos);
        console.log(terrain.getVoxel(lastPos.x, lastPos.y, lastPos.z));
        return;
      }

      if (e.button === 2 && lastPos) {
        console.log("remove");

        const size = this.optionsStore.getValue().size;
        const sphereRadius = size;
        const sphereVector3 = { x: 0, y: 0, z: 0 };

        for (let x = -Math.floor(size); x < Math.ceil(size); x++) {
          for (let y = -Math.floor(size); y < Math.ceil(size); y++) {
            for (let z = -Math.floor(size); z < Math.ceil(size); z++) {
              const v =
                Math.sqrt(
                  (x - sphereVector3.x) * (x - sphereVector3.x) +
                  (y - sphereVector3.y) * (y - sphereVector3.y) +
                  + (z - sphereVector3.z) * (z - sphereVector3.z)
                ) < sphereRadius;

              if (v) {
                const pos = new Vector3(lastPos.x - + x, lastPos.y + y, lastPos.z + z);

                if (pos.x >= 0 && pos.y >= 0 && pos.z >= 0 && pos.x < terrain.size && pos.y < terrain.size && pos.z < terrain.size) {
                  terrain.setBlockMaterial(lastPos.x - + x, lastPos.y + y, lastPos.z + z, "gaz");
                }
              }
            }
          }
        }

        console.log("re-render");

        terrain.rerender();
      }
    };
  }

  unbind() { }
}
