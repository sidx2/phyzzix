import { mat4, vec3 } from 'gl-matrix';

const WORLD_UP = vec3.fromValues(0, 1, 0);

export class FPSController {
    position = vec3.fromValues(0, 1.6, 15);
    yaw = -Math.PI / 2;
    pitch = 0;

    forward = vec3.create();
    right = vec3.create();
    up = vec3.create();

    speed = 10;
    sensitivity = 0.002;

    update(keys: Record<string, boolean>, mouseDelta: { x: number, y: number }, dt: number) {
        // Mouse
        this.yaw += mouseDelta.x * this.sensitivity;
        this.pitch -= mouseDelta.y * this.sensitivity;

        const limit = Math.PI / 2 - 0.01;
        this.pitch = Math.max(-limit, Math.min(limit, this.pitch));

        // Forward
        this.forward[0] = Math.cos(this.pitch) * Math.cos(this.yaw);
        this.forward[1] = Math.sin(this.pitch);
        this.forward[2] = Math.cos(this.pitch) * Math.sin(this.yaw);
        vec3.normalize(this.forward, this.forward);

        // Right & Up
        vec3.cross(this.right, this.forward, WORLD_UP);
        vec3.normalize(this.right, this.right);

        vec3.cross(this.up, this.right, this.forward);
        vec3.normalize(this.up, this.up);

        const v = (this.speed * (keys['Shift'] ? 2 : 1)) * dt;

        const noYForward = vec3.fromValues(this.forward[0], 0, this.forward[2]);

        if (keys['w']) vec3.scaleAndAdd(this.position, this.position, noYForward, v);
        if (keys['s']) vec3.scaleAndAdd(this.position, this.position, noYForward, -v);
        if (keys['a']) vec3.scaleAndAdd(this.position, this.position, this.right, -v);
        if (keys['d']) vec3.scaleAndAdd(this.position, this.position, this.right, v);

        mouseDelta.x = 0;
        mouseDelta.y = 0;
    }

    getViewMatrix(out = mat4.create()) {
        const target = vec3.add(vec3.create(), this.position, this.forward);
        return mat4.lookAt(out, this.position, target, this.up);
    }
}
