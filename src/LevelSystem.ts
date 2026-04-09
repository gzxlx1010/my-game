import * as THREE from 'three';

export interface LevelConfig {
  level: number;
  name: string;
  description: string;
  
  // 地图配置
  mapSize: number;           // 地图大小
  hasObstacles: boolean;     // 是否有障碍物
  
  // 地面颜色
  groundColor: number;       // 地面颜色
  groundColorSecondary?: number; // 地面渐变辅助色
  
  // 天空配置
  skyColor: number;          // 天空颜色
  fogColor: number;          // 雾颜色
  
  // 敌人配置
  enemyCount: number;        // 敌人初始数量
  enemySpeed: number;        // 敌人移动速度倍率
  enemyHealth: number;       // 敌人生命值倍率
  enemyDamage: number;       // 敌人攻击力倍率
  
  // 通关条件
  killTarget: number;        // 需要击杀的敌人数量
  
  // 入口位置
  portalPosition?: THREE.Vector3;
}

export interface LevelProgress {
  currentLevel: number;
  totalKills: number;
  killTarget: number;
  isPortalActive: boolean;
  portalPosition: THREE.Vector3 | null;
}

// 关卡配置
export const LEVEL_CONFIGS: LevelConfig[] = [
  // 第一关：沙漠
  {
    level: 1,
    name: '沙漠战场',
    description: '沙漠训练场 - 熟悉基本操作',
    mapSize: 300,
    hasObstacles: false,
    groundColor: 0xc2a366,      // 沙漠黄
    groundColorSecondary: 0xd4bc82,
    skyColor: 0x87ceeb,         // 浅蓝天空
    fogColor: 0xe8d5a3,         // 沙尘雾
    enemyCount: 5,
    enemySpeed: 0.6,
    enemyHealth: 0.8,
    enemyDamage: 0.7,
    killTarget: 5
  },
  // 第二关：绿洲
  {
    level: 2,
    name: '绿洲攻防',
    description: '绿洲据点 - 有掩护的战斗',
    mapSize: 400,
    hasObstacles: true,
    groundColor: 0x4a7c4e,      // 草地绿
    groundColorSecondary: 0x5a8c5e,
    skyColor: 0x6bb3d9,         // 蓝天
    fogColor: 0x8fbc8f,         // 绿雾
    enemyCount: 8,
    enemySpeed: 0.8,
    enemyHealth: 1.0,
    enemyDamage: 0.85,
    killTarget: 8
  },
  // 第三关：秋叶
  {
    level: 3,
    name: '秋叶巷战',
    description: '秋日战场 - 激烈的对抗',
    mapSize: 450,
    hasObstacles: true,
    groundColor: 0xb87333,      // 秋叶橙/棕
    groundColorSecondary: 0xcc8844,
    skyColor: 0xffa07a,         // 晚霞
    fogColor: 0xdaa520,         // 金色雾
    enemyCount: 12,
    enemySpeed: 1.0,
    enemyHealth: 1.2,
    enemyDamage: 1.0,
    killTarget: 12
  },
  // 第四关：雪原
  {
    level: 4,
    name: '雪域绝境',
    description: '冰封战场 - 最终决战',
    mapSize: 500,
    hasObstacles: true,
    groundColor: 0xe8e8e8,      // 雪白
    groundColorSecondary: 0xd0d0d0,
    skyColor: 0xb0c4de,         // 阴沉天空
    fogColor: 0xffffff,         // 白雾
    enemyCount: 15,
    enemySpeed: 1.2,
    enemyHealth: 1.5,
    enemyDamage: 1.2,
    killTarget: 15
  }
];

export class LevelSystem {
  private scene: THREE.Scene;
  private currentLevel: number = 1;
  private totalKills: number = 0;
  private killTarget: number = 5;
  private isPortalActive: boolean = false;
  private portal: THREE.Mesh | null = null;
  private portalLight: THREE.PointLight | null = null;
  private portalPosition: THREE.Vector3 | null = null;
  
  private portalParticles: THREE.Points | null = null;
  private portalAnimationTime: number = 0;
  
  private onLevelComplete: (() => void) | null = null;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  public setLevelCompleteCallback(callback: () => void): void {
    this.onLevelComplete = callback;
  }
  
  public getCurrentLevelConfig(): LevelConfig {
    return LEVEL_CONFIGS[this.currentLevel - 1] || LEVEL_CONFIGS[0];
  }
  
  public getProgress(): LevelProgress {
    return {
      currentLevel: this.currentLevel,
      totalKills: this.totalKills,
      killTarget: this.killTarget,
      isPortalActive: this.isPortalActive,
      portalPosition: this.portalPosition
    };
  }
  
  public startLevel(level: number): void {
    if (level < 1 || level > LEVEL_CONFIGS.length) {
      level = 1;
    }
    
    this.currentLevel = level;
    this.totalKills = 0;
    this.isPortalActive = false;
    this.killTarget = LEVEL_CONFIGS[level - 1].killTarget;
    this.removePortal();
    
    console.log(`[LevelSystem] Starting Level ${level}: ${LEVEL_CONFIGS[level - 1].name}`);
  }
  
  public onEnemyKilled(): void {
    this.totalKills++;
    console.log(`[LevelSystem] Kill ${this.totalKills}/${this.killTarget}`);
    
    if (this.totalKills >= this.killTarget && !this.isPortalActive) {
      this.activatePortal();
    }
  }
  
  public checkPortalEnter(playerPosition: THREE.Vector3): boolean {
    if (!this.isPortalActive || !this.portalPosition) {
      return false;
    }
    
    // 使用水平距离（忽略高度差）
    const dx = playerPosition.x - this.portalPosition.x;
    const dz = playerPosition.z - this.portalPosition.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    
    console.log(`[LevelSystem] Portal distance check: ${horizontalDistance.toFixed(1)} (threshold: 20)`);
    
    if (horizontalDistance < 20) { // 入口水平半径
      this.completeLevel();
      return true;
    }
    
    return false;
  }
  
  private activatePortal(): void {
    this.isPortalActive = true;
    
    // 生成入口位置（玩家初始位置附近，便于找到）
    const config = this.getCurrentLevelConfig();
    const spawnZ = config.mapSize * 0.8; // 与玩家出生点z位置一致
    
    // 入口生成在玩家出生点前方一定距离
    this.portalPosition = new THREE.Vector3(
      (Math.random() - 0.5) * 100,  // x方向随机偏移
      0,
      spawnZ - 100 - Math.random() * 50  // 在玩家前方
    );
    
    this.createPortal();
    
    // 显示提示
    this.showPortalMessage();
    
    console.log(`[LevelSystem] Portal activated at (${this.portalPosition.x.toFixed(0)}, ${this.portalPosition.z.toFixed(0)})`);
  }
  
  private createPortal(): void {
    if (!this.portalPosition) return;
    
    // 入口主体 - 发光圆环
    const portalGeometry = new THREE.TorusGeometry(12, 1.5, 16, 32);
    const portalMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.9
    });
    
    this.portal = new THREE.Mesh(portalGeometry, portalMaterial);
    this.portal.position.copy(this.portalPosition);
    this.portal.position.y = 20;
    this.portal.rotation.x = Math.PI / 2;
    this.scene.add(this.portal);
    
    // 内部光晕
    const glowGeometry = new THREE.CircleGeometry(10, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(this.portalPosition);
    glow.position.y = 20.1;
    this.portal.add(glow);
    
    // 点光源
    this.portalLight = new THREE.PointLight(0x00ff88, 3, 80);
    this.portalLight.position.copy(this.portalPosition);
    this.portalLight.position.y = 25;
    this.scene.add(this.portalLight);
    
    // 粒子效果
    this.createPortalParticles();
  }
  
  private createPortalParticles(): void {
    if (!this.portalPosition) return;
    
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 15;
      
      positions[i * 3] = this.portalPosition.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = this.portalPosition.z + Math.sin(angle) * radius;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x00ff88,
      size: 0.5,
      transparent: true,
      opacity: 0.8
    });
    
    this.portalParticles = new THREE.Points(geometry, material);
    this.scene.add(this.portalParticles);
  }
  
  private showPortalMessage(): void {
    const message = document.getElementById('level-message');
    if (message) {
      message.textContent = '出口已开启！';
      message.style.opacity = '1';
      message.style.color = '#00ff88';
      
      setTimeout(() => {
        message.style.opacity = '0';
      }, 3000);
    }
  }
  
  public update(delta: number): void {
    this.portalAnimationTime += delta;
    
    // 旋转入口
    if (this.portal) {
      this.portal.rotation.z += delta * 0.5;
    }
    
    // 脉冲光源
    if (this.portalLight) {
      this.portalLight.intensity = 3 + Math.sin(this.portalAnimationTime * 3) * 1.5;
    }
    
    // 粒子上升动画
    if (this.portalParticles && this.portalPosition) {
      const positions = this.portalParticles.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += delta * 10;
        
        // 重置到底部
        if (positions[i * 3 + 1] > 50) {
          positions[i * 3 + 1] = 0;
          
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 15;
          positions[i * 3] = this.portalPosition.x + Math.cos(angle) * radius;
          positions[i * 3 + 2] = this.portalPosition.z + Math.sin(angle) * radius;
        }
      }
      
      this.portalParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
  
  private completeLevel(): void {
    console.log(`[LevelSystem] Level ${this.currentLevel} completed!`);
    
    this.removePortal();
    
    if (this.onLevelComplete) {
      this.onLevelComplete();
    }
  }
  
  private removePortal(): void {
    if (this.portal) {
      this.scene.remove(this.portal);
      this.portal.geometry.dispose();
      (this.portal.material as THREE.Material).dispose();
      this.portal = null;
    }
    
    if (this.portalLight) {
      this.scene.remove(this.portalLight);
      this.portalLight = null;
    }
    
    if (this.portalParticles) {
      this.scene.remove(this.portalParticles);
      this.portalParticles.geometry.dispose();
      (this.portalParticles.material as THREE.Material).dispose();
      this.portalParticles = null;
    }
    
    this.portalPosition = null;
    this.isPortalActive = false;
  }
  
  public nextLevel(): boolean {
    if (this.currentLevel < LEVEL_CONFIGS.length) {
      this.startLevel(this.currentLevel + 1);
      return true;
    }
    return false; // 没有更多关卡
  }
  
  public isGameComplete(): boolean {
    return this.currentLevel >= LEVEL_CONFIGS.length && this.totalKills >= this.killTarget;
  }
  
  public getTotalLevels(): number {
    return LEVEL_CONFIGS.length;
  }
}
