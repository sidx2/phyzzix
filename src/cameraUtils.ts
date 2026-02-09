import { mat4, vec3 } from "gl-matrix";

export const getCameraVectors = (yaw: number, pitch: number) => {
    const { sin, cos } = Math;
    const forward = vec3.fromValues(
        cos(pitch) * cos(yaw),
        sin(pitch),
        cos(pitch) * sin(yaw)   
    );

    vec3.normalize(forward, forward);

    const right = vec3.normalize(
        vec3.create(),
        vec3.cross(vec3.create(), forward, vec3.fromValues(0, 1, 0)),
    );

    return { forward, right };
}

export const updateCamera = (yaw: number, pitch: number, cameraPos: vec3, dt: number) => {
    const { forward, right }  = getCameraVectors(yaw, pitch);
}

export const buildViewMatrix = (yaw: number, pitch: number, cameraPos: vec3) => {
    const { forward, right }  = getCameraVectors(yaw, pitch);

    const target = vec3.add(vec3.create(), cameraPos, forward);

    return mat4.lookAt(
        mat4.create(),
        cameraPos,
        target,
        vec3.fromValues(0, 1, 0)
    );
}