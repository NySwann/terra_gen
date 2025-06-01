import { Vector3 } from "@babylonjs/core";
import { Terrain } from "./Terrain";

export interface RayZ {
    origin: Vector3;
    direction: Vector3;
}

function rayBoxIntersection(ray: RayZ, size: number, t0: number, t1: number): { result: false } | { result: true, tMin: number, tMax: number } {
    const minBound = new Vector3(0, 0, 0);
    const maxBound = new Vector3(size, size, size);

    let tMin: number;
    let tMax: number;

    let tYMin: number;
    let tYMax: number;
    let tZMin: number;
    let tZMax: number;

    const x_inv_dir = 1 / ray.direction.x;
    if (x_inv_dir >= 0) {
        tMin = (minBound.x - ray.origin.x) * x_inv_dir;
        tMax = (maxBound.x - ray.origin.x) * x_inv_dir;
    } else {
        tMin = (maxBound.x - ray.origin.x) * x_inv_dir;
        tMax = (minBound.x - ray.origin.x) * x_inv_dir;
    }

    const y_inv_dir = 1 / ray.direction.y;
    if (y_inv_dir >= 0) {
        tYMin = (minBound.y - ray.origin.y) * y_inv_dir;
        tYMax = (maxBound.y - ray.origin.y) * y_inv_dir;
    } else {
        tYMin = (maxBound.y - ray.origin.y) * y_inv_dir;
        tYMax = (minBound.y - ray.origin.y) * y_inv_dir;
    }

    if (tMin > tYMax || tYMin > tMax) return { result: false }
    if (tYMin > tMin) tMin = tYMin;
    if (tYMax < tMax) tMax = tYMax;

    const z_inv_dir = 1 / ray.direction.z;
    if (z_inv_dir >= 0) {
        tZMin = (minBound.z - ray.origin.z) * z_inv_dir;
        tZMax = (maxBound.z - ray.origin.z) * z_inv_dir;
    } else {
        tZMin = (maxBound.z - ray.origin.z) * z_inv_dir;
        tZMax = (minBound.z - ray.origin.z) * z_inv_dir;
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

// assumes voxels indices start at 1
export function amanatidesWooAlgorithm(ray: RayZ, size: number, getVoxel: (x: number, y: number, z:number) => boolean, t0: number, t1: number): Vector3 | null {
    const minBound = new Vector3(0, 0, 0);
    const voxelSize = new Vector3(1.0, 1.0, 1.0);

    let tMin: number;
    let tMax: number;

    const ray_intersects_grid = rayBoxIntersection(ray, size, t0, t1);

    if (!ray_intersects_grid.result) return null;

    tMin = ray_intersects_grid.tMin;
    tMax = ray_intersects_grid.tMax;

    tMin = Math.max(tMin, t0);
    tMax = Math.max(tMax, t1);

    const ray_start = ray.origin.add(ray.direction.scale(tMin));
    const ray_end = ray.origin.add(ray.direction.scale(tMax));

    let current_X_index = Math.max(1, Math.ceil(ray_start.x - minBound.x / voxelSize.x));
    const end_X_index = Math.max(1, Math.ceil(ray_end.x - minBound.x / voxelSize.x));
    let stepX: number; // int
    let tDeltaX: number;
    let tMaxX: number;
    if (ray.direction.x > 0.0) {
        stepX = 1;
        tDeltaX = voxelSize.x / ray.direction.x;
        tMaxX = tMin + (minBound.x + current_X_index * voxelSize.x
            - ray_start.x) / ray.direction.x;
    } else if (ray.direction.x < 0.0) {
        stepX = -1;
        tDeltaX = voxelSize.x / -ray.direction.x;
        const previous_X_index = current_X_index - 1;
        tMaxX = tMin + (minBound.x + previous_X_index * voxelSize.x
            - ray_start.x) / ray.direction.x;
    } else {
        stepX = 0;
        tDeltaX = tMax;
        tMaxX = tMax;
    }

    let current_Y_index: number = Math.max(1, Math.ceil(ray_start.y - minBound.y / voxelSize.y));
    const end_Y_index: number = Math.max(1, Math.ceil(ray_end.y - minBound.y / voxelSize.y));
    let stepY: number; // int
    let tDeltaY: number;
    let tMaxY: number;
    if (ray.direction.y > 0.0) {
        stepY = 1;
        tDeltaY = voxelSize.y / ray.direction.y;
        tMaxY = tMin + (minBound.y + current_Y_index * voxelSize.y
            - ray_start.y) / ray.direction.y;
    } else if (ray.direction.y < 0.0) {
        stepY = -1;
        tDeltaY = voxelSize.y / -ray.direction.y;
        const previous_Y_index = current_Y_index - 1;
        tMaxY = tMin + (minBound.y + previous_Y_index * voxelSize.y
            - ray_start.y) / ray.direction.y;
    } else {
        stepY = 0;
        tDeltaY = tMax;
        tMaxY = tMax;
    }

    let current_Z_index: number = Math.max(1, Math.ceil(ray_start.z - minBound.z / voxelSize.z));
    const end_Z_index: number = Math.max(1, Math.ceil(ray_end.z - minBound.z / voxelSize.z));
    let stepZ: number;
    let tDeltaZ: number;
    let tMaxZ: number;
    if (ray.direction.z > 0.0) {
        stepZ = 1;
        tDeltaZ = voxelSize.z / ray.direction.z;
        tMaxZ = tMin + (minBound.z + current_Z_index * voxelSize.z
            - ray_start.z) / ray.direction.z;
    } else if (ray.direction.z < 0.0) {
        stepZ = -1;
        tDeltaZ = voxelSize.z / -ray.direction.z;
        const previous_Z_index = current_Z_index - 1;
        tMaxZ = tMin + (minBound.z + previous_Z_index * voxelSize.z
            - ray_start.z) / ray.direction.z;
    } else {
        stepZ = 0;
        tDeltaZ = tMax;
        tMaxZ = tMax;
    }

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

        if (getVoxel(current_X_index, current_Y_index, current_Z_index)) {
            return new Vector3(current_X_index, current_Y_index, current_Z_index);
        }
    }

    return null;
}