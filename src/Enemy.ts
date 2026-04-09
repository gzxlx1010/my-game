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
  lastAttackTime: number;
  attackCooldown: number;
  armGroup: THREE.Group | null;
}

export class Enemy {
  private scene: THREE.Scene;
  private enemies: EnemyData[] = [];
  private colliders: THREE.Mesh[] = [];
  private playerRef: THREE.Vector3 | null = null;
  private onPlayerDamage: ((damage: number) => void) | null = null;
  private audioCtx: AudioContext | null = null;
  
  private readonly SPAWN_POINTS = [
    // A site区域 - 远离箱子的开放区域
    { x: -420, z: -280 },  // A site左侧开放区
    { x: -180, z: -350 },  // A site边缘
    // B site区域 - 远离箱子的开放区域
    { x: 150, z: 320 },    // B site右侧开放区
    { x: -80, z: 380 },    // B site后方
    // A隧道区域 - 隧道外开放区
    { x: -620, z: -250 },  // A tunnel入口外
    { x: -650, z: 50 },    // A tunnel侧方
    // B隧道区域 - 隧道外开放区
    { x: 680, z: 50 },     // B tunnel入口外
    { x: 620, z: 280 },    // B tunnel侧方
    // CT spawn区域
    { x: 180, z: -450 },    // CT spawn
    { x: 320, z: -520 },   // CT spawn后方
    // Mid区域 - 远离箱子的开放区域
    { x: -180, z: -30 },   // Mid左侧
    { x: 200, z: 80 },     // Mid右侧
    // Long A区域
    { x: -500, z: 480 },   // Long A
    // T spawn区域
    { x: 480, z: 480 },    // T spawn
    // 其他开放区域
    { x: -550, z: -400 },  // 左下角
    { x: 550, z: -350 },   // 右下角
  ];
  
  private readonly MAX_ENEMIES = 15;
  private readonly DEATH_DURATION = 2.0;
  private readonly RESPAWN_DELAY = 5.0;
  private readonly ENEMY_RADIUS = 8;
  private readonly ENEMY_DAMAGE = 15;
  private readonly ENEMY_ATTACK_COOLDOWN = 1.5;

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
    const enemyGroup = new THREE.Group();
    
    // Body (taller to match player height of 35)
    const bodyGeo = new THREE.CylinderGeometry(4, 4, 26, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 13;
    body.name = 'body';
    enemyGroup.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(3, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 29;
    head.name = 'head';
    enemyGroup.add(head);
    
    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-1, 29, 2.5);
    enemyGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(1, 29, 2.5);
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
    
    // Arms for attack animation
    const armGroup = new THREE.Group();
    const armGeo = new THREE.CylinderGeometry(1, 1, 12, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-5, 15, 0);
    leftArm.rotation.z = Math.PI / 6;
    leftArm.name = 'leftArm';
    armGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(5, 15, 0);
    rightArm.rotation.z = -Math.PI / 6;
    rightArm.name = 'rightArm';
    armGroup.add(rightArm);
    
    enemyGroup.add(armGroup);
    
    enemyGroup.scale.set(0.5, 0.5, 0.5);
    
    // Hitbox mesh (height matches player height of 35)
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(this.ENEMY_RADIUS, this.ENEMY_RADIUS, 35, 16),
      new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.2,
        visible: false
      })
    );
    mesh.position.set(x, 17.5, z);
    mesh.castShadow = true;
    mesh.userData.isEnemy = true;
    mesh.userData.enemyGroup = enemyGroup;
    mesh.add(enemyGroup);
    
    // 设置visualGroup位置 - 让脚底在地平面y=0
    // body底部在relative y=0.5, head顶部在relative y=34, legs底部在relative y=-10
    // 要让legs底部接触地面(y=0)，visualGroup需要向上偏移10
    enemyGroup.position.set(0, 10, 0);
    
    return {
      mesh,
      visualGroup: enemyGroup,
      position: new THREE.Vector3(x, 17.5, z), // y=17.5是碰撞体中心
      speed: 30 + Math.random() * 20,
      health: 100,
      maxHealth: 100,
      alertRange: 80,
      attackRange: 15,
      state: 'idle',
      targetPosition: new THREE.Vector3(),
      deathTime: 0,
      lastAttackTime: 0,
      attackCooldown: this.ENEMY_ATTACK_COOLDOWN,
      armGroup
    };
  }

  public setColliders(colliders: THREE.Mesh[]): void {
    this.colliders = colliders;
  }

  public setPlayerRef(playerPos: THREE.Vector3): void {
    this.playerRef = playerPos;
  }

  public setDamageCallback(callback: (damage: number) => void): void {
    this.onPlayerDamage = callback;
  }

  public setAudioContext(ctx: AudioContext): void {
    this.audioCtx = ctx;
  }

  private playAttackSound(): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    
    // 敌人攻击音效 - 类似打击声
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(100, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc2.start();
    osc2.stop(ctx.currentTime + 0.1);
  }

  private attackPlayer(enemy: EnemyData, playerPosition: THREE.Vector3): void {
    const now = performance.now() / 1000;
    if (now - enemy.lastAttackTime < enemy.attackCooldown) return;
    
    // 使用水平距离（忽略高度差）
    const dx = playerPosition.x - enemy.position.x;
    const dz = playerPosition.z - enemy.position.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    
    if (horizontalDist > enemy.attackRange) return;
    
    enemy.lastAttackTime = now;
    enemy.state = 'attack';
    
    // 播放攻击音效
    this.playAttackSound();
    
    // 造成伤害
    if (this.onPlayerDamage) {
      this.onPlayerDamage(this.ENEMY_DAMAGE);
    }
    
    // 攻击动画 - 手臂挥动
    this.animateAttack(enemy);
  }

  private animateAttack(enemy: EnemyData): void {
    if (!enemy.armGroup) return;
    
    const startRotation = { left: Math.PI / 6, right: -Math.PI / 6 };
    const attackRotation = { left: Math.PI / 2, right: -Math.PI / 2 };
    const duration = 300;
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      // 挥动动画
      const swing = Math.sin(t * Math.PI) * 0.5;
      const leftArm = enemy.armGroup!.getObjectByName('leftArm') as THREE.Mesh;
      const rightArm = enemy.armGroup!.getObjectByName('rightArm') as THREE.Mesh;
      
      if (leftArm) {
        leftArm.rotation.z = startRotation.left + swing * 1.2;
        leftArm.rotation.x = Math.sin(t * Math.PI) * 0.5;
      }
      if (rightArm) {
        rightArm.rotation.z = startRotation.right - swing * 1.2;
        rightArm.rotation.x = -Math.sin(t * Math.PI) * 0.5;
      }
      
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // 恢复原位
        if (leftArm) leftArm.rotation.z = startRotation.left;
        if (rightArm) rightArm.rotation.z = startRotation.right;
        enemy.state = 'chase';
      }
    };
    
    animate();
  }

  private checkCollision(x: number, z: number, enemyPos: THREE.Vector3): boolean {
    for (const collider of this.colliders) {
      const box = new THREE.Box3().setFromObject(collider);
      
      // 膨胀碰撞盒（敌人半径）
      const expandedBox = new THREE.Box3(
        new THREE.Vector3(box.min.x - this.ENEMY_RADIUS, box.min.y, box.min.z - this.ENEMY_RADIUS),
        new THREE.Vector3(box.max.x + this.ENEMY_RADIUS, box.max.y, box.max.z + this.ENEMY_RADIUS)
      );
      
      const enemyBox = new THREE.Box3(
        new THREE.Vector3(x - this.ENEMY_RADIUS, enemyPos.y - 17.5, z - this.ENEMY_RADIUS),
        new THREE.Vector3(x + this.ENEMY_RADIUS, enemyPos.y + 17.5, z + this.ENEMY_RADIUS)
      );
      
      if (enemyBox.intersectsBox(expandedBox)) {
        return true;
      }
    }
    return false;
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
      return true;
    }
    
    this.flashEnemy(enemy, 0xff0000);
    return false;
  }
  
  private flashEnemy(enemy: EnemyData, color: number): void {
    const body = enemy.visualGroup.getObjectByName('body') as THREE.Mesh;
    if (body) {
      const mat = body.material as THREE.MeshStandardMaterial;
      const originalColor = mat.color.getHex();
      mat.color.setHex(color);
      setTimeout(() => {
        mat.color.setHex(originalColor);
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
        
        const fallProgress = Math.min(enemy.deathTime / this.DEATH_DURATION, 1);
        enemy.visualGroup.rotation.x = fallProgress * Math.PI / 2;
        enemy.visualGroup.position.y = -fallProgress * 10;
        
        enemy.visualGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.transparent = true;
            mat.opacity = 1 - fallProgress;
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
      
      // 使用水平距离计算（忽略高度差）
      const dx = playerPosition.x - enemy.position.x;
      const dz = playerPosition.z - enemy.position.z;
      const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);
      
      // State machine
      if (distanceToPlayer < enemy.attackRange) {
        if (enemy.state !== 'attack') {
          enemy.state = 'attack';
        }
        // 攻击玩家 - 传递playerPosition
        this.attackPlayer(enemy, playerPosition);
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
        
        // 尝试移动
        let newX = enemy.position.x + direction.x * moveSpeed * delta;
        let newZ = enemy.position.z + direction.z * moveSpeed * delta;
        
        // 检查碰撞
        if (!this.checkCollision(newX, newZ, enemy.position)) {
          enemy.position.x = newX;
          enemy.position.z = newZ;
          enemy.mesh.position.x = newX;
          enemy.mesh.position.z = newZ;
        } else {
          // 碰撞了，尝试绕行
          const perpDir = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
          let moved = false;
          
          // 尝试左侧
          const leftX = enemy.position.x + perpDir.x * moveSpeed * delta;
          const leftZ = enemy.position.z + perpDir.z * moveSpeed * delta;
          
          if (!this.checkCollision(leftX, leftZ, enemy.position)) {
            enemy.position.x = leftX;
            enemy.position.z = leftZ;
            enemy.mesh.position.x = leftX;
            enemy.mesh.position.z = leftZ;
            moved = true;
          } else {
            // 尝试右侧
            const rightX = enemy.position.x - perpDir.x * moveSpeed * delta;
            const rightZ = enemy.position.z - perpDir.z * moveSpeed * delta;
            
            if (!this.checkCollision(rightX, rightZ, enemy.position)) {
              enemy.position.x = rightX;
              enemy.position.z = rightZ;
              enemy.mesh.position.x = rightX;
              enemy.mesh.position.z = rightZ;
              moved = true;
            }
          }
          
          // 如果左右都走不了，后退
          if (!moved) {
            const backX = enemy.position.x - direction.x * moveSpeed * delta * 0.5;
            const backZ = enemy.position.z - direction.z * moveSpeed * delta * 0.5;
            
            if (!this.checkCollision(backX, backZ, enemy.position)) {
              enemy.position.x = backX;
              enemy.position.z = backZ;
              enemy.mesh.position.x = backX;
              enemy.mesh.position.z = backZ;
            }
          }
        }
        
        if (enemy.state === 'chase') {
          const facingDir = new THREE.Vector3().subVectors(targetPos, enemy.position);
          if (facingDir.length() > 0.1) {
            enemy.mesh.rotation.y = Math.atan2(facingDir.x, facingDir.z);
          }
        }
      }
      
      // Visual feedback for state
      const body = enemy.visualGroup.getObjectByName('body') as THREE.Mesh;
      if (body) {
        const mat = body.material as THREE.MeshStandardMaterial;
        let color = 0x333333;
        if (enemy.state === 'chase' || enemy.state === 'attack') {
          color = 0xff0000;
        } else if (enemy.state === 'patrol') {
          color = 0xff8800;
        }
        mat.color.setHex(color);
      }
    }
  }
  
  private respawnEnemy(enemy: EnemyData): void {
    const spawnPoint = this.SPAWN_POINTS[Math.floor(Math.random() * this.SPAWN_POINTS.length)];
    
    enemy.position.set(spawnPoint.x, 17.5, spawnPoint.z);
    enemy.mesh.position.set(spawnPoint.x, 17.5, spawnPoint.z);
    enemy.health = enemy.maxHealth;
    enemy.state = 'idle';
    enemy.deathTime = 0;
    
    enemy.mesh.visible = true;
    enemy.visualGroup.visible = true;
    enemy.visualGroup.rotation.set(0, 0, 0);
    enemy.visualGroup.position.set(0, 0, 0);
    
    enemy.visualGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.transparent = false;
        mat.opacity = 1;
      }
    });
  }

  public getEnemies(): EnemyData[] {
    return this.enemies;
  }

  public getActiveEnemies(): EnemyData[] {
    return this.enemies.filter(e => e.state !== 'dying' && e.state !== 'dead');
  }

  public getAllEnemyMeshes(): THREE.Object3D[] {
    return this.enemies
      .filter(e => e.state !== 'dying' && e.state !== 'dead')
      .map(e => e.mesh);
  }
}
