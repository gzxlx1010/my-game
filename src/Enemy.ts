import * as THREE from 'three';

export interface EnemyData {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  speed: number;
  health: number;
  alertRange: number;
  attackRange: number;
  state: 'idle' | 'patrol' | 'chase' | 'attack';
  targetPosition: THREE.Vector3;
  lastAlertTime: number;
}

export class Enemy {
  private scene: THREE.Scene;
  private enemies: EnemyData[] = [];
  private colliders: THREE.Mesh[] = [];
  
  private readonly SPAWN_POINTS = [
    { x: -280, z: -240 },  // A site
    { x: 0, z: 220 },       // B site
    { x: -500, z: -100 },  // A tunnel
    { x: 500, z: 100 },     // B tunnel
    { x: 200, z: -300 },   // CT spawn
    { x: 0, z: 100 },      // Mid
  ];
  
  private readonly MAX_ENEMIES = 8;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnEnemies(count: number): void {
    for (let i = 0; i < count && this.enemies.length < this.MAX_ENEMIES; i++) {
      const spawnPoint = this.SPAWN_POINTS[i % this.SPAWN_POINTS.length];
      const enemy = this.createEnemy(spawnPoint.x, spawnPoint.z);
      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);
    }
  }

  private createEnemy(x: number, z: number): EnemyData {
    // Create enemy mesh (simplified soldier model)
    const enemyGroup = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.CylinderGeometry(4, 4, 16, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 8;
    enemyGroup.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(3, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 18;
    enemyGroup.add(head);
    
    // Eyes (for direction indication)
    const eyeGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-1, 18, 2.5);
    enemyGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(1, 18, 2.5);
    enemyGroup.add(rightEye);
    
    // Legs
    const legGeo = new THREE.CylinderGeometry(1.5, 1.5, 10, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-2, -5, 0);
    enemyGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(2, -5, 0);
    enemyGroup.add(rightLeg);
    
    // Scale up the enemy
    enemyGroup.scale.set(0.5, 0.5, 0.5);
    
    // Convert group to single mesh for easier collision
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 20, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b0000, transparent: true, opacity: 0.8 })
    );
    mesh.position.set(x, 10, z);
    mesh.castShadow = true;
    mesh.userData.isEnemy = true;
    
    // Store visual group as user data
    mesh.userData.visualGroup = enemyGroup;
    mesh.add(enemyGroup);
    
    return {
      mesh,
      position: new THREE.Vector3(x, 10, z),
      speed: 30 + Math.random() * 20,
      health: 100,
      alertRange: 80,
      attackRange: 15,
      state: 'idle',
      targetPosition: new THREE.Vector3(),
      lastAlertTime: 0
    };
  }

  public setColliders(colliders: THREE.Mesh[]): void {
    this.colliders = colliders;
  }

  public update(delta: number, playerPosition: THREE.Vector3): void {
    for (const enemy of this.enemies) {
      const distanceToPlayer = enemy.position.distanceTo(playerPosition);
      
      // State machine
      if (distanceToPlayer < enemy.attackRange) {
        enemy.state = 'attack';
      } else if (distanceToPlayer < enemy.alertRange) {
        enemy.state = 'chase';
      } else if (enemy.state === 'chase') {
        enemy.state = 'idle';
      } else if (enemy.state === 'idle' && Math.random() < 0.01) {
        enemy.state = 'patrol';
        enemy.targetPosition.set(
          enemy.position.x + (Math.random() - 0.5) * 100,
          enemy.position.y,
          enemy.position.z + (Math.random() - 0.5) * 100
        );
      }
      
      // Movement based on state
      let targetPos: THREE.Vector3;
      
      switch (enemy.state) {
        case 'chase':
          targetPos = playerPosition;
          break;
        case 'patrol':
          targetPos = enemy.targetPosition;
          if (enemy.position.distanceTo(enemy.targetPosition) < 5) {
            enemy.state = 'idle';
          }
          break;
        default:
          targetPos = enemy.position.clone();
      }
      
      // Move towards target
      if (enemy.state === 'chase' || enemy.state === 'patrol') {
        const direction = new THREE.Vector3()
          .subVectors(targetPos, enemy.position)
          .normalize();
        
        // Add some randomness to patrol movement
        if (enemy.state === 'patrol') {
          direction.x += (Math.random() - 0.5) * 0.3;
          direction.z += (Math.random() - 0.5) * 0.3;
          direction.normalize();
        }
        
        const moveSpeed = enemy.state === 'chase' ? enemy.speed : enemy.speed * 0.3;
        const moveX = direction.x * moveSpeed * delta;
        const moveZ = direction.z * moveSpeed * delta;
        
        // Simple collision avoidance
        let newX = enemy.position.x + moveX;
        let newZ = enemy.position.z + moveZ;
        
        // Check collision with map colliders
        for (const collider of this.colliders) {
          const box = new THREE.Box3().setFromObject(collider);
          const enemyBox = new THREE.Box3(
            new THREE.Vector3(newX - 3, enemy.position.y - 10, newZ - 3),
            new THREE.Vector3(newX + 3, enemy.position.y + 10, newZ + 3)
          );
          
          if (enemyBox.intersectsBox(box)) {
            // Try to move around obstacle
            newX = enemy.position.x;
            newZ = enemy.position.z;
            
            // Try perpendicular directions
            const perpDir = new THREE.Vector3(-direction.z, 0, direction.x);
            if (Math.random() > 0.5) {
              perpDir.negate();
            }
            newX += perpDir.x * enemy.speed * delta;
            newZ += perpDir.z * enemy.speed * delta;
          }
        }
        
        enemy.position.x = newX;
        enemy.position.z = newZ;
        enemy.mesh.position.x = newX;
        enemy.mesh.position.z = newZ;
        
        // Face movement direction
        if (enemy.state === 'chase') {
          enemy.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        }
      }
      
      // Visual feedback for alert state
      const visualGroup = enemy.mesh.userData.visualGroup as THREE.Group;
      if (visualGroup) {
        // Make enemy flash red when chasing
        const body = visualGroup.children[0] as THREE.Mesh;
        if (enemy.state === 'chase' || enemy.state === 'attack') {
          (body.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
        } else if (enemy.state === 'patrol') {
          (body.material as THREE.MeshStandardMaterial).color.setHex(0xff8800);
        } else {
          (body.material as THREE.MeshStandardMaterial).color.setHex(0x333333);
        }
      }
    }
  }

  public getEnemies(): EnemyData[] {
    return this.enemies;
  }

  public getEnemyMeshes(): THREE.Mesh[] {
    return this.enemies.map(e => e.mesh);
  }
}
