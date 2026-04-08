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
  
  private readonly MOVE_SPEED = 280;
  private readonly JUMP_FORCE = 12;
  private readonly GRAVITY = 30;
  private readonly PLAYER_HEIGHT = 60;
  private readonly PLAYER_RADIUS = 15;
  
  private velocityY = 0;
  private isOnGround = true;
  
  // Walking simulation
  private walkTime = 0;
  private isWalking = false;
  private readonly STEP_INTERVAL = 0.5; // Steps per second
  
  // Breathing simulation
  private breathTime = 0;
  private breathSpeed = 0.8;
  private baseFOV = 75;
  private targetFOV = 75;
  private readonly BREATH_INTENSITY = 1.5;
  
  // Head bob
  private headBobTime = 0;
  private readonly HEAD_BOB_AMOUNT_Y = 0.08;
  private readonly HEAD_BOB_AMOUNT_X = 0.04;
  private readonly HEAD_BOB_SPEED = 12;
  
  // Landing effect
  private landingBob = 0;
  
  // Camera smoothing
  private smoothLookX = 0;
  private smoothLookY = 0;
  private readonly LOOK_SMOOTH = 0.15;
  
  // Footstep sound
  private lastFootstep = 0;

  constructor(camera: THREE.PerspectiveCamera, startPosition: THREE.Vector3) {
    this.camera = camera;
    this.position = startPosition.clone();
    this.camera.position.copy(this.position);
    
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.baseFOV = camera.fov;
    
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
          this.landingBob = 0;
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
    // Apply smoothing to mouse look
    this.smoothLookX -= event.movementX * sensitivity;
    this.smoothLookY -= event.movementY * sensitivity;
    this.smoothLookY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.smoothLookY));
  }

  public update(delta: number, colliders: THREE.Mesh[]): void {
    if (!this.isLocked) return;
    
    // Update walking state
    this.isWalking = (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) && this.isOnGround;
    
    // Apply friction
    const friction = this.isWalking ? 8.0 : 10.0;
    this.velocity.x -= this.velocity.x * friction * delta;
    this.velocity.z -= this.velocity.z * friction * delta;
    
    // Apply gravity
    this.velocityY -= this.GRAVITY * delta;
    
    // Direction
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();
    
    // Movement with acceleration
    const accel = this.isWalking ? this.MOVE_SPEED : this.MOVE_SPEED * 0.5;
    if (this.moveForward || this.moveBackward) {
      this.velocity.z += this.direction.z * accel * delta;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x += this.direction.x * accel * delta;
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
      // Landing effect
      if (!this.isOnGround && this.velocityY < -5) {
        this.landingBob = Math.min(Math.abs(this.velocityY) * 0.1, 0.3);
      }
      
      this.position.y = groundY + this.PLAYER_HEIGHT;
      this.velocityY = 0;
      this.isOnGround = true;
      this.canJump = true;
    }
    
    // Update camera position
    this.camera.position.copy(this.position);
    
    // Update camera rotation with smoothing
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y += (this.smoothLookX - this.euler.y) * this.LOOK_SMOOTH;
    this.euler.x += (this.smoothLookY - this.euler.x) * this.LOOK_SMOOTH;
    this.camera.quaternion.setFromEuler(this.euler);
    this.smoothLookX = 0;
    this.smoothLookY = 0;
    
    // Update head bob and breathing
    this.updateHeadBob(delta);
    this.updateBreathing(delta);
    this.updateFootsteps(delta);
  }

  private updateHeadBob(delta: number): void {
    // Landing bob recovery
    this.landingBob *= 0.9;
    
    // Walking head bob
    if (this.isWalking) {
      this.headBobTime += delta * this.HEAD_BOB_SPEED;
      this.walkTime += delta;
    } else {
      // Smoothly return to center
      this.headBobTime *= 0.95;
    }
    
    // Calculate bob offsets
    const bobX = Math.sin(this.headBobTime) * this.HEAD_BOB_AMOUNT_X;
    const bobY = Math.abs(Math.cos(this.headBobTime)) * this.HEAD_BOB_AMOUNT_Y;
    
    // Apply to camera
    this.camera.position.x += bobX;
    this.camera.position.y += bobY + this.landingBob;
  }

  private updateBreathing(delta: number): void {
    this.breathTime += delta * this.breathSpeed;
    
    // Breathing intensity based on movement
    const intensity = this.isWalking ? this.BREATH_INTENSITY * 1.5 : this.BREATH_INTENSITY;
    
    // Breathing FOV effect
    this.targetFOV = this.baseFOV + Math.sin(this.breathTime * 2) * intensity * 0.3;
    
    // Smooth FOV transition
    this.camera.fov += (this.targetFOV - this.camera.fov) * 0.05;
    this.camera.updateProjectionMatrix();
    
    // Subtle camera rotation from breathing
    const breathRotX = Math.sin(this.breathTime) * 0.003 * intensity;
    const breathRotY = Math.cos(this.breathTime * 0.7) * 0.002 * intensity;
    
    this.euler.x += breathRotX;
    this.euler.y += breathRotY;
  }

  private updateFootsteps(delta: number): void {
    if (!this.isWalking) {
      this.lastFootstep = 0;
      return;
    }
    
    this.lastFootstep += delta;
    
    // Footstep interval (slightly faster when running)
    const interval = this.STEP_INTERVAL * 0.8;
    
    if (this.lastFootstep >= interval) {
      this.lastFootstep = 0;
      this.playFootstep();
    }
  }

  private playFootstep(): void {
    // Create footstep sound using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(80 + Math.random() * 40, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not supported or blocked
    }
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
  
  public isMoving(): boolean {
    return this.isWalking;
  }
}
