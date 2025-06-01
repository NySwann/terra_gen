import { MeshBuilder, StandardMaterial, Color3, Vector3, Matrix, TransformNode, Mesh } from "@babylonjs/core";
import { Terrain } from "./Terrain";
import { Tool } from "./tools/tool";
import MainScene from "../scenes/MainScene/MainScene";

export class EraserTool implements Tool {
    rendered: TransformNode;
    selectorMesh: Mesh;

    bind(terrain: Terrain, scene: MainScene) {
        this.rendered = new TransformNode("root2", scene);

        let lastPick = new Date();
        // in voxel grid space
        let lastPos: Vector3 | null = null;

        const selectorMesh = MeshBuilder.CreateBox(
            "sphere",
            { size: 0.5 },
            scene
        );
        selectorMesh.isPickable = false;
        const selectorMeshMaterial = new StandardMaterial("", scene);
        selectorMeshMaterial.diffuseColor = Color3.Yellow();
        selectorMesh.material = selectorMeshMaterial;
        selectorMesh.parent = this.rendered;
        selectorMesh.renderOutline = true;
        selectorMesh.forceRenderingWhenOccluded = true;
        selectorMesh.renderingGroupId = 1.0;

        this.selectorMesh = selectorMesh;

        scene.onPointerMove = (e) => {
            if (new Date().getTime() - lastPick.getTime() < 16) {
                return;
            }

            lastPick = new Date();

            const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), scene.camera);

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

            console.log(o);

            const d = Vector3.TransformNormal(ray.direction, matrix);
            const far = o.add(d.scale(10));
            //selectorMesh2.position.set(far.x, far.y, far.z);

            //const wm = this.rendered.getWorldMatrix();

            // wm.invert();

            // const o = Vector3.TransformCoordinates(origin, wm);

            // //selectorMesh.position.set(o.x, o.y, o.z);

            // const d = Vector3.TransformNormal(ray.direction, wm);

            const rayz = { origin: o, direction: d };

            const hitz = amanatidesWooAlgorithm(rayz, terrain, 0.0, 1.0);

            if (hitz) {
                lastPos = hitz;

                // back to world space

                const pos = Vector3.TransformCoordinates(lastPos, owner.getWorldMatrix());

                this.selectorMesh.position.set(pos.x, pos.y, pos.z);
            }
        }

        scene.onPointerDown = (e) => {
            console.log(lastPos);

            if (e.button === 0 && lastPos) {
                console.log(lastPos);
                console.log(terrain.getVoxel(lastPos.x, lastPos.y, lastPos.z));
            }

            if (e.button === 2 && lastPos) {
                terrain.removeShit(lastPos.x, lastPos.y, lastPos.z);
            }
        }
    }

    unbind() {

    }
}

interface RayZ {
    origin: Vector3;
    direction: Vector3;
}

function rayBoxIntersection(ray: RayZ, grid: Terrain, t0: number, t1: number): { result: false } | { result: true, tMin: number, tMax: number } {
    let tMin: number;
    let tMax: number;

    let tYMin: number;
    let tYMax: number;
    let tZMin: number;
    let tZMax: number;

    const x_inv_dir = 1 / ray.direction.x;
    if (x_inv_dir >= 0) {
        tMin = (grid.minBound().x - ray.origin.x) * x_inv_dir;
        tMax = (grid.maxBound().x - ray.origin.x) * x_inv_dir;
    } else {
        tMin = (grid.maxBound().x - ray.origin.x) * x_inv_dir;
        tMax = (grid.minBound().x - ray.origin.x) * x_inv_dir;
    }

    const y_inv_dir = 1 / ray.direction.y;
    if (y_inv_dir >= 0) {
        tYMin = (grid.minBound().y - ray.origin.y) * y_inv_dir;
        tYMax = (grid.maxBound().y - ray.origin.y) * y_inv_dir;
    } else {
        tYMin = (grid.maxBound().y - ray.origin.y) * y_inv_dir;
        tYMax = (grid.minBound().y - ray.origin.y) * y_inv_dir;
    }

    if (tMin > tYMax || tYMin > tMax) return { result: false }
    if (tYMin > tMin) tMin = tYMin;
    if (tYMax < tMax) tMax = tYMax;

    const z_inv_dir = 1 / ray.direction.z;
    if (z_inv_dir >= 0) {
        tZMin = (grid.minBound().z - ray.origin.z) * z_inv_dir;
        tZMax = (grid.maxBound().z - ray.origin.z) * z_inv_dir;
    } else {
        tZMin = (grid.maxBound().z - ray.origin.z) * z_inv_dir;
        tZMax = (grid.minBound().z - ray.origin.z) * z_inv_dir;
    }

    if (tMin > tZMax || tZMin > tMax) return { result: false }
    if (tZMin > tMin) tMin = tZMin;
    if (tZMax < tMax) tMax = tZMax;

    if (tMin < t1 && tMax > t0) {
        return { result: true, tMin, tMax };
    }

    // return false;

    return { result: true, tMin, tMax };
}

function amanatidesWooAlgorithm(ray: RayZ, grid: Terrain, t0: number, t1: number): Vector3 | null {
    let tMin: number;
    let tMax: number;

    // console.log("allo");
    // console.log(grid.minBound());
    // console.log(grid.maxBound());
    // console.log(ray.origin);
    // console.log(ray.direction);

    const ray_intersects_grid = rayBoxIntersection(ray, grid, t0, t1);

    if (!ray_intersects_grid.result) console.log("no intersect");

    if (!ray_intersects_grid.result) return;

    console.log("intersect!!!");

    tMin = ray_intersects_grid.tMin;
    tMax = ray_intersects_grid.tMax;

    tMin = Math.max(tMin, t0);
    tMax = Math.max(tMax, t1);

    const ray_start = ray.origin.add(ray.direction.scale(tMin));
    const ray_end = ray.origin.add(ray.direction.scale(tMax));

    let current_X_index = Math.max(1, Math.ceil(ray_start.x - grid.minBound().x / grid.voxelSize().x));
    const end_X_index = Math.max(1, Math.ceil(ray_end.x - grid.minBound().x / grid.voxelSize().x));
    let stepX: number; // int
    let tDeltaX: number;
    let tMaxX: number;
    if (ray.direction.x > 0.0) {
        stepX = 1;
        tDeltaX = grid.voxelSize().x / ray.direction.x;
        tMaxX = tMin + (grid.minBound().x + current_X_index * grid.voxelSize().x
            - ray_start.x) / ray.direction.x;
    } else if (ray.direction.x < 0.0) {
        stepX = -1;
        tDeltaX = grid.voxelSize().x / -ray.direction.x;
        const previous_X_index = current_X_index - 1;
        tMaxX = tMin + (grid.minBound().x + previous_X_index * grid.voxelSize().x
            - ray_start.x) / ray.direction.x;
    } else {
        stepX = 0;
        tDeltaX = tMax;
        tMaxX = tMax;
    }

    let current_Y_index: number = Math.max(1, Math.ceil(ray_start.y - grid.minBound().y / grid.voxelSize().y));
    const end_Y_index: number = Math.max(1, Math.ceil(ray_end.y - grid.minBound().y / grid.voxelSize().y));
    let stepY: number; // int
    let tDeltaY: number;
    let tMaxY: number;
    if (ray.direction.y > 0.0) {
        stepY = 1;
        tDeltaY = grid.voxelSize().y / ray.direction.y;
        tMaxY = tMin + (grid.minBound().y + current_Y_index * grid.voxelSize().y
            - ray_start.y) / ray.direction.y;
    } else if (ray.direction.y < 0.0) {
        stepY = -1;
        tDeltaY = grid.voxelSize().y / -ray.direction.y;
        const previous_Y_index = current_Y_index - 1;
        tMaxY = tMin + (grid.minBound().y + previous_Y_index * grid.voxelSize().y
            - ray_start.y) / ray.direction.y;
    } else {
        stepY = 0;
        tDeltaY = tMax;
        tMaxY = tMax;
    }

    let current_Z_index: number = Math.max(1, Math.ceil(ray_start.z - grid.minBound().z / grid.voxelSize().z));
    const end_Z_index: number = Math.max(1, Math.ceil(ray_end.z - grid.minBound().z / grid.voxelSize().z));
    let stepZ: number;
    let tDeltaZ: number;
    let tMaxZ: number;
    if (ray.direction.z > 0.0) {
        stepZ = 1;
        tDeltaZ = grid.voxelSize().z / ray.direction.z;
        tMaxZ = tMin + (grid.minBound().z + current_Z_index * grid.voxelSize().z
            - ray_start.z) / ray.direction.z;
    } else if (ray.direction.z < 0.0) {
        stepZ = -1;
        tDeltaZ = grid.voxelSize().z / -ray.direction.z;
        const previous_Z_index = current_Z_index - 1;
        tMaxZ = tMin + (grid.minBound().z + previous_Z_index * grid.voxelSize().z
            - ray_start.z) / ray.direction.z;
    } else {
        stepZ = 0;
        tDeltaZ = tMax;
        tMaxZ = tMax;
    }

    //console.log("allo");

    while (current_X_index != end_X_index || current_Y_index != end_Y_index || current_Z_index != end_Z_index) {
        if (tMaxX < tMaxY && tMaxX < tMaxZ) {
            // X-axis traversal.
            current_X_index += stepX;
            tMaxX += tDeltaX;
        } else if (tMaxY < tMaxZ) {
            // Y-axis traversal.
            current_Y_index += stepY;
            tMaxY += tDeltaY;
        } else {
            // Z-axis traversal.
            current_Z_index += stepZ;
            tMaxZ += tDeltaZ;
        }
        if (grid.getBlock(current_X_index, current_Y_index, current_Z_index).v === "solid") {
            return new Vector3(current_X_index, current_Y_index, current_Z_index);
        }
        //console.log(current_X_index, current_Y_index, current_Z_index);
    }

    return null;
}