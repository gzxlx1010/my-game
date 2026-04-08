import * as THREE from 'three';

export interface EnemyData {
  mesh: THREE.Mesh;
  visualGroup: THREE.Group;
  position: THREE.Vector3;
  speed: number;
  health: number;
  maxHealth: number;
  alertRange: number;
  attackRange: number;
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'dying' | 'dead';
  targetPosition: THREE.Vector3;
  deathTime: number;
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
  private readonly DEATH_DURATION = 2.0;  // 死亡动画持续时间
  private readonly RESPAWN_DELAY = 5.0;  // 复活延迟

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
    // Create visual group for enemy
    const enemyGroup = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.CylinderGeometry(4, 4, 16, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 8;
    body.name = 'body';
    enemyGroup.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(3, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 18;
    head.name = 'head';
    enemyGroup.add(head);
    
    // Eyes (red, for direction indication)
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
    leftLeg.name = 'leftLeg';
    enemyGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(2, -5, 0);
    rightLeg.name = 'rightLeg';
    enemyGroup.add(rightLeg);
    
    // Scale up
    enemyGroup.scale.set(0.5, 0.5, 0.5);
    
    // Create hitbox mesh (invisible collision mesh)
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 20, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.3,
        visible: false  // 隐藏碰撞体，只用于射线检测
      })
    );
    mesh.position.set(x, 10, z);
    mesh.castShadow = true;
    mesh.userData.isEnemy = true;
    mesh.userData.enemyGroup = enemyGroup;
    mesh.add(enemyGroup);
    
    return {
      mesh,
      visualGroup: enemyGroup,
      position: new THREE.Vector3(x, 10, z),
      speed: 30 + Math.random() * 20,
      health: 100,
      maxHealth: 100,
      alertRange: 80,
      attackRange: 15,
      state: 'idle',
      targetPosition: new THREE.Vector3(),
      deathTime: 0
    };
  }

  public setColliders(colliders: THREE.Mesh[]): void {
    this.colliders = colliders;
  }

  public takeDamage(enemyMesh: THREE.Object3D, damage: number): boolean {
    const enemy = this.enemies.find(e => e.mesh === enemyMesh || e.visualGroup === enemyMesh);
    if (!enemy || enemy.state === 'dying' || enemy.state === 'dead') {
      return false;
    }
    
    enemy.health -= damage;
    
    if (enemy.health <= 0) {
      enemy.state = 'dying';
      enemy.deathTime = 0;
      const mat = enemy.mesh.material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = 0.3;
      this.playDeathSound();
      return true;  // 敌人死亡
    }
    
    // 受伤时闪红
    this.flashEnemy(enemy, 0xff0000);
    return false;
  }
  
  private flashEnemy(enemy: EnemyData, color: number): void {
    const body = enemy.visualGroup.getObjectByName('body') as THREE.Mesh;
    if (body) {
      const originalColor = (body.material as THREE.MeshStandardMaterial).color.getHex();
      (body.material as THREE.MeshStandardMaterial).color.setHex(color);
      setTimeout(() => {
        (body.material as THREE.MeshStandardMaterial).color.setHex(originalColor);
      }, 100);
    }
  }
  
  private playDeathSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {
      // Audio not supported
    }
  }

  public update(delta: number, playerPosition: THREE.Vector3): void {
    for (const enemy of this.enemies) {
      // 处理死亡动画
      if (enemy.state === 'dying') {
        enemy.deathTime += delta;
        
        // 倒下动画
        const fallProgress = Math.min(enemy.deathTime / this.DEATH_DURATION, 1);
        enemy.visualGroup.rotation.x = fallProgress * Math.PI / 2;
        enemy.visualGroup.position.y = -fallProgress * 10;
        
        // 逐渐消失
        enemy.visualGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material.transparent = true;
            child.material.opacity = 1 - fallProgress;
          }
        });
        
        if (enemy.deathTime >= this.DEATH_DURATION) {
          enemy.state = 'dead';
          enemy.mesh.visible = false;
          enemy.visualGroup.visible = false;
          enemy.deathTime = 0;
        }
        continue;
      }
      
      // 复活逻辑
      if (enemy.state === 'dead') {
        enemy.deathTime += delta;
        if (enemy.deathTime >= this.RESPAWN_DELAY) {
          this.respawnEnemy(enemy);
        }
        continue;
      }
      
      const distanceToPlayer = enemy.position.distanceTo(playerPosition);
      
      // State machine
      if (distanceToPlayer < enemy.attackRange) {
        enemy.state = 'attack';
      } else if (distanceToPlayer < enemy.alertRange) {
        enemy.state = 'chase';
      } else if (enemy.state === 'chase') {
        enemy.state = 'idle';
      } else if (enemy.state === 'idle' && Math.random() < 0.005) {
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
        
        if (enemy.state === 'patrol') {
          direction.x += (Math.random() - 0.5) * 0.3;
          direction.z += (Math.random() - 0.5) * 0.3;
          direction.normalize();
        }
        
        const moveSpeed = enemy.state === 'chase' ? enemy.speed : enemy.speed * 0.3;
        let newX = enemy.position.x + direction.x * moveSpeed * delta;
        let newZ = enemy.position.z + direction.z * moveSpeed * delta;
        
        // Collision avoidance
        for (const collider of this.colliders) {
          const box = new THREE.Box3().setFromObject(collider);
          const enemyBox = new THREE.Box3(
            new THREE.Vector3(newX - 3, enemy.position.y - 10, newZ - 3),
            new THREE.Vector3(newX + 3, enemy.position.y + 10, newZ + 3)
          );
          
          if (enemyBox.intersectsBox(box)) {
            newX = enemy.position.x;
            newZ = enemy.position.z;
            
            const perpDir = new THREE.Vector3(-direction.z, 0, direction.x);
            if (Math.random() > 0.5) perpDir.negate();
            newX += perpDir.x * enemy.speed * delta;
            newZ += perpDir.z * enemy.speed * delta;
          }
        }
        
        enemy.position.x = newX;
        enemy.position.z = newZ;
        enemy.mesh.position.x = newX;
        enemy.mesh.position.z = newZ;
        
        if (enemy.state === 'chase') {
          enemy.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        }
      }
      
      // Visual feedback for state
      const body = enemy.visualGroup.getObjectByName('body') as THREE.Mesh;
      if (body) {
        let color = 0x333333;
        if (enemy.state === 'chase' || enemy.state === 'attack') {
          color = 0xff0000;
        } else if (enemy.state === 'patrol') {
          color = 0xff8800;
        }
        (body.material as THREE.MeshStandardMaterial).color.setHex(color);
      }
    }
  }
  
  private respawnEnemy(enemy: EnemyData): void {
    const spawnPoint = this.SPAWN_POINTS[Math.floor(Math.random() * this.SPAWN_POINTS.length)];
    
    enemy.position.set(spawnPoint.x, 10, spawnPoint.z);
    enemy.mesh.position.set(spawnPoint.x, 10, spawnPoint.z);
    enemy.health = enemy.maxHealth;
    enemy.state = 'idle';
    enemy.deathTime = 0;
    
    enemy.mesh.visible = true;
    enemy.visualGroup.visible = true;
    enemy.visualGroup.rotation.set(0, 0, 0);
    enemy.visualGroup.position.set(0, 0, 0);
    
    enemy.visualGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.transparent = false;
        child.material.opacity = 1;
      }
    });
  }

  public getEnemies(): EnemyData[] {
    return this.enemies;
  }

  public getActiveEnemies(): EnemyData[] {
    return this.enemies.filter(e => e.state !== 'dying' && e.state !== 'dead');
  }

  public getEnemyMeshes(): THREE.Object3D[] {
    return this.enemies
      .filter(e => e.state !== 'dying' && e.state !== 'dead')
      .map(e => e.mesh);
  }
  
  public getAllEnemyMeshes(): THREE.Object3D[] {
    return this.enemies.map(e => e.mesh);
  }
}
