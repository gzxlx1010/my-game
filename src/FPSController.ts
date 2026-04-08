import * as THREE from 'three';

export class FPSController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  
  private euler: THREE.Euler;
  private velocity: THREE.Vector3;
  private direction: THREE.Vector3;
  
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private canJump = true;
  
  private isLocked = false;
  
  private readonly MOVE_SPEED = 400;
  private readonly JUMP_FORCE = 15;
  private readonly GRAVITY = 40;
  private readonly PLAYER_HEIGHT = 30;
  private readonly PLAYER_RADIUS = 15;
  
  private velocityY = 0;
  private isOnGround = true;

  constructor(camera: THREE.PerspectiveCamera, startPosition: THREE.Vector3) {
    this.camera = camera;
    this.position = startPosition.clone();
    this.camera.position.copy(this.position);
    
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    
    this.setupControls();
  }

  private setupControls(): void {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('click', () => this.requestPointerLock());
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement !== null;
    });
  }

  private requestPointerLock(): void {
    if (!this.isLocked) {
      document.body.requestPointerLock();
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
      case 'Space':
        if (this.canJump && this.isOnGround) {
          this.velocityY = this.JUMP_FORCE;
          this.isOnGround = false;
        }
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isLocked) return;
    
    const sensitivity = 0.002;
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= event.movementX * sensitivity;
    this.euler.x -= event.movementY * sensitivity;
    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  }

  public update(delta: number, colliders: THREE.Mesh[]): void {
    if (!this.isLocked) return;
    
    // Apply friction
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    
    // Apply gravity
    this.velocityY -= this.GRAVITY * delta;
    
    // Direction
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();
    
    // Movement
    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * this.MOVE_SPEED * delta;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * this.MOVE_SPEED * delta;
    }
    
    // Apply velocity to position
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    
    const moveX = right.x * this.velocity.x * delta + forward.x * this.velocity.z * delta;
    const moveZ = right.z * this.velocity.x * delta + forward.z * this.velocity.z * delta;
    
    // Simple collision detection
    let canMoveX = true;
    let canMoveZ = true;
    
    for (const collider of colliders) {
      const box = new THREE.Box3().setFromObject(collider);
      
      const testBoxX = new THREE.Box3(
        new THREE.Vector3(this.position.x + moveX - this.PLAYER_RADIUS, this.position.y - this.PLAYER_HEIGHT, this.position.z - this.PLAYER_RADIUS),
        new THREE.Vector3(this.position.x + moveX + this.PLAYER_RADIUS, this.position.y, this.position.z + this.PLAYER_RADIUS)
      );
      
      const testBoxZ = new THREE.Box3(
        new THREE.Vector3(this.position.x - this.PLAYER_RADIUS, this.position.y - this.PLAYER_HEIGHT, this.position.z + moveZ - this.PLAYER_RADIUS),
        new THREE.Vector3(this.position.x + this.PLAYER_RADIUS, this.position.y, this.position.z + moveZ + this.PLAYER_RADIUS)
      );
      
      if (testBoxX.intersectsBox(box)) {
        canMoveX = false;
      }
      if (testBoxZ.intersectsBox(box)) {
        canMoveZ = false;
      }
    }
    
    if (canMoveX) this.position.x += moveX;
    if (canMoveZ) this.position.z += moveZ;
    
    // Vertical movement
    this.position.y += this.velocityY * delta;
    
    // Ground check
    const groundY = this.getGroundHeight(this.position.x, this.position.z, colliders);
    if (this.position.y < groundY + this.PLAYER_HEIGHT) {
      this.position.y = groundY + this.PLAYER_HEIGHT;
      this.velocityY = 0;
      this.isOnGround = true;
      this.canJump = true;
    }
    
    // Update camera position
    this.camera.position.copy(this.position);
  }

  private getGroundHeight(x: number, z: number, colliders: THREE.Mesh[]): number {
    let maxY = -Infinity;
    
    for (const collider of colliders) {
      const box = new THREE.Box3().setFromObject(collider);
      if (x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z) {
        if (box.max.y > maxY && box.max.y < this.position.y + 5) {
          maxY = box.max.y;
        }
      }
    }
    
    return maxY === -Infinity ? 0 : maxY;
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
}
