/**
 * Player Controller
 *
 * Desktop-first WASD movement with mouse look.
 * Features: walk, sprint, approximate collision, photo mode toggle.
 */

import * as THREE from 'three';

export interface PlayerControllerConfig {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  spawnPosition?: THREE.Vector3;
  spawnLookAt?: THREE.Vector3;
}

export class PlayerController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  // Movement state
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private sprint = false;
  private isLocked = false;
  private photoMode = false;

  // Camera euler angles
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private mouseSensitivity = 0.002;

  // Physics
  private readonly walkSpeed = 25;
  private readonly sprintSpeed = 45;
  private readonly friction = 8;
  private readonly gravity = -30;
  private verticalVelocity = 0;
  private isGrounded = true;
  private readonly playerHeight = 3;
  private readonly minY = -8;

  // Position
  readonly position: THREE.Vector3;

  // Free camera for photo mode
  private photoSpeed = 40;

  constructor(config: PlayerControllerConfig) {
    this.camera = config.camera;
    this.domElement = config.domElement;
    this.position = config.spawnPosition?.clone() || new THREE.Vector3(0, 15, 60);
    this.camera.position.copy(this.position);

    if (config.spawnLookAt) {
      this.camera.lookAt(config.spawnLookAt);
      this.euler.setFromQuaternion(this.camera.quaternion);
    }

    this.setupControls();
  }

  private setupControls(): void {
    // Pointer lock
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    // Mouse look
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= e.movementX * this.mouseSensitivity;
      this.euler.x -= e.movementY * this.mouseSensitivity;
      this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyD': this.moveRight = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.sprint = true; break;
      case 'KeyP':
        this.photoMode = !this.photoMode;
        break;
      case 'Space':
        if (this.isGrounded && !this.photoMode) {
          this.verticalVelocity = 12;
          this.isGrounded = false;
        }
        if (this.photoMode) {
          this.position.y += 0.5;
        }
        break;
      case 'KeyC':
        if (this.photoMode) {
          this.position.y -= 0.5;
        }
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyD': this.moveRight = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.sprint = false; break;
    }
  }

  update(dt: number): void {
    if (!this.isLocked) return;

    const speed = this.photoMode
      ? this.photoSpeed
      : (this.sprint ? this.sprintSpeed : this.walkSpeed);

    // Calculate movement direction
    this.direction.set(0, 0, 0);
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    this.camera.getWorldDirection(forward);
    if (!this.photoMode) {
      forward.y = 0;
    }
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.moveForward) this.direction.add(forward);
    if (this.moveBackward) this.direction.sub(forward);
    if (this.moveRight) this.direction.add(right);
    if (this.moveLeft) this.direction.sub(right);

    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
    }

    // Apply movement
    const accel = this.direction.multiplyScalar(speed);
    this.velocity.x += (accel.x - this.velocity.x * this.friction) * dt;
    this.velocity.z += (accel.z - this.velocity.z * this.friction) * dt;

    if (this.photoMode) {
      this.velocity.y += (accel.y - this.velocity.y * this.friction) * dt;
    } else {
      // Gravity
      this.verticalVelocity += this.gravity * dt;
      this.velocity.y = this.verticalVelocity;

      // Ground collision
      if (this.position.y + this.velocity.y * dt <= this.minY + this.playerHeight) {
        this.position.y = this.minY + this.playerHeight;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    this.position.add(this.velocity.clone().multiplyScalar(dt));

    // Clamp to world bounds
    const bound = 160;
    this.position.x = Math.max(-bound, Math.min(bound, this.position.x));
    this.position.z = Math.max(-bound, Math.min(bound, this.position.z));

    if (!this.photoMode && this.position.y < this.minY + this.playerHeight) {
      this.position.y = this.minY + this.playerHeight;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }

    this.camera.position.copy(this.position);
  }

  get isPhotoMode(): boolean {
    return this.photoMode;
  }

  get locked(): boolean {
    return this.isLocked;
  }

  /** Get the forward direction the player is facing (for compass) */
  getForwardAngle(): number {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    return Math.atan2(forward.x, forward.z);
  }

  dispose(): void {
    document.removeEventListener('pointerlockchange', () => {});
  }
}
