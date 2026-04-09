import * as THREE from 'three';
import { FPSController } from './FPSController';
import { Dust2Map } from './Dust2Map';
import { AK47 } from './AK47';
import { Remington } from './Remington';
import { Knife } from './Knife';
import { Enemy } from './Enemy';
import { ShootingSystem } from './ShootingSystem';
import { Weapon } from './Weapon';
import { Medkit } from './Medkit';
import { DecalSystem } from './DecalSystem';
import { LevelSystem, LEVEL_CONFIGS } from './LevelSystem';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private fpsController!: FPSController;
  private dust2Map!: Dust2Map;
  private weapons: Map<number, Weapon> = new Map();
  private currentWeaponSlot = 1; // 1 = AK47, 2 = Remington, 3 = Knife
  private currentWeapon!: Weapon;
  private enemy!: Enemy;
  private shootingSystem!: ShootingSystem;
  private clock: THREE.Clock;
  private isRunning = false;
  private movementIndicator!: HTMLElement | null;
  private sprintIndicator!: HTMLElement | null;
  private isMouseDown = false; // 全局鼠标状态
  private audioCtx: AudioContext | null = null; // 共享AudioContext
  
  // 受击系统相关元素
  private bloodScreen!: HTMLElement | null;
  private healthFill!: HTMLElement | null;
  private healthDamage!: HTMLElement | null;
  private healthText!: HTMLElement | null;
  private healthStatus!: HTMLElement | null;
  private deathScreen!: HTMLElement | null;
  private isDead = false;
  
  // 医疗系统
  private medkit!: Medkit;
  private medkitPrompt!: HTMLElement | null;
  private healingContainer!: HTMLElement | null;
  private healingFill!: HTMLElement | null;
  private healingPercent!: HTMLElement | null;
  private nearbyMedkit: any = null;
  
  // 贴花系统
  private decalSystem!: DecalSystem;
  
  // 关卡系统
  private levelSystem!: LevelSystem;
  private levelUI!: HTMLElement | null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.clock = new THREE.Clock();
    
    this.movementIndicator = null;
    
    this.init();
  }

  private init(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x87ceeb);
    
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0xc9b896, 200, 1500);
    
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    this.dust2Map = new Dust2Map(this.scene);
    
    const startPosition = new THREE.Vector3(0, 35, 400); // y=35是眼睛高度，脚底在y=0
    this.fpsController = new FPSController(this.camera, startPosition);
    
    this.scene.add(this.camera);
    
    // 创建武器
    const ak47 = new AK47(this.scene, this.camera);
    const remington = new Remington(this.scene, this.camera);
    const knife = new Knife(this.scene, this.camera);
    
    // 创建共享状态引用
    const mouseDownRef = { value: this.isMouseDown };
    const audioCtxRef = { value: this.audioCtx };
    
    // 设置武器的外部状态引用
    ak47.setExternalState(mouseDownRef, audioCtxRef);
    remington.setExternalState(mouseDownRef, audioCtxRef);
    knife.setExternalState(mouseDownRef, audioCtxRef);
    
    this.weapons.set(1, ak47);
    this.weapons.set(2, remington);
    this.weapons.set(3, knife);
    this.currentWeapon = this.weapons.get(1)!;
    
    // 隐藏非当前武器
    remington.getWeaponGroup().visible = false;
    knife.getWeaponGroup().visible = false;
    
    // 设置武器控制
    this.setupWeaponControls();
    
    this.shootingSystem = new ShootingSystem(this.camera);
    this.shootingSystem.setWallColliders(this.dust2Map.colliders);
    
    this.enemy = new Enemy(this.scene);
    this.enemy.setColliders(this.dust2Map.colliders);
    this.enemy.spawnEnemies(15); // 增加到15个敌人
    // enemy.setAudioContext将在有AudioContext时设置
    
    // 初始化医疗包
    this.medkit = new Medkit(this.scene);
    this.medkit.setColliders(this.dust2Map.colliders);
    this.medkit.spawnMedkits(5);
    
    // 初始化贴花系统
    this.decalSystem = new DecalSystem(this.scene);
    
    this.movementIndicator = document.getElementById('movement-indicator');
    this.sprintIndicator = document.getElementById('sprint-indicator');
    
    // 初始化受击系统UI元素
    this.bloodScreen = document.getElementById('blood-screen');
    this.healthFill = document.getElementById('health-fill');
    this.healthDamage = document.getElementById('health-damage');
    this.healthText = document.getElementById('health-text');
    this.healthStatus = document.getElementById('health-status');
    this.deathScreen = document.getElementById('death-screen');
    
    // 设置FPSController的伤害回调
    this.fpsController.onDamageTaken = (health: number, maxHealth: number) => {
      this.updateHealthUI(health, maxHealth);
      this.showBloodScreen();
    };
    
    // 设置FPSController的死亡回调
    this.fpsController.onDeath = () => {
      this.handlePlayerDeath();
    };
    
    // 设置敌人的伤害回调和玩家引用
    this.enemy.setDamageCallback((damage: number) => {
      this.fpsController.takeDamage(damage);
    });
    this.enemy.setPlayerRef(this.fpsController.getPosition());
    
    // 设置复活按钮事件
    const respawnBtn = document.getElementById('respawn-btn');
    if (respawnBtn) {
      respawnBtn.addEventListener('click', () => {
        this.respawnPlayer();
      });
    }
    
    // 获取医疗UI元素
    this.medkitPrompt = document.getElementById('medkit-prompt');
    this.healingContainer = document.getElementById('healing-bar-container');
    this.healingFill = document.getElementById('healing-fill');
    this.healingPercent = document.getElementById('healing-percent');
    
    // 初始化关卡系统
    this.levelSystem = new LevelSystem(this.scene);
    this.levelSystem.setLevelCompleteCallback(() => this.handleLevelComplete());
    
    // 获取关卡UI元素
    this.levelUI = document.getElementById('level-info');
    
    // 启动第一关
    this.startLevel(1);
    
    // 设置FPSController的医疗回调
    this.fpsController.onHealing = (health: number, maxHealth: number) => {
      this.updateHealthUI(health, maxHealth);
      this.showHealCompleteEffect();
      this.hideHealingUI();
    };
    
    // 设置键盘事件（医疗包交互）
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && !this.isDead) {
        this.handleMedkitInteraction();
      }
    });

    window.addEventListener('resize', () => this.onResize());
  }
  
  // 处理医疗包交互
  private handleMedkitInteraction(): void {
    // 如果正在医疗，取消
    if (this.fpsController.isCurrentlyHealing()) {
      this.fpsController.cancelHealing();
      this.hideHealingUI();
      return;
    }
    
    // 如果有附近的医疗包，开始医疗
    if (this.nearbyMedkit) {
      const started = this.fpsController.startHealing(this.nearbyMedkit.position);
      if (started) {
        this.showHealingUI();
        this.playHealingSound();
      }
    }
  }
  
  // 显示医疗包提示
  private showMedkitPrompt(): void {
    if (this.medkitPrompt && this.fpsController.getHealth() < this.fpsController.getMaxHealth()) {
      this.medkitPrompt.classList.add('visible');
    }
  }
  
  // 隐藏医疗包提示
  private hideMedkitPrompt(): void {
    if (this.medkitPrompt) {
      this.medkitPrompt.classList.remove('visible');
    }
  }
  
  // 显示医疗进度条
  private showHealingUI(): void {
    if (this.healingContainer) {
      this.healingContainer.classList.add('active');
    }
    this.hideMedkitPrompt();
  }
  
  // 隐藏医疗进度条
  private hideHealingUI(): void {
    if (this.healingContainer) {
      this.healingContainer.classList.remove('active');
    }
    if (this.healingFill) {
      this.healingFill.style.width = '0%';
    }
  }
  
  // 更新医疗进度
  private updateHealingUI(): void {
    if (!this.fpsController.isCurrentlyHealing()) {
      this.hideHealingUI();
      return;
    }
    
    const progress = this.fpsController.getHealingProgress();
    
    if (this.healingFill) {
      this.healingFill.style.width = `${progress * 100}%`;
    }
    if (this.healingPercent) {
      this.healingPercent.textContent = `${Math.floor(progress * 100)}%`;
    }
  }
  
  // 显示医疗完成特效
  private showHealCompleteEffect(): void {
    const effect = document.createElement('div');
    effect.className = 'heal-complete-effect';
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
    this.playHealCompleteSound();
  }
  
  // 播放医疗音效
  private playHealingSound(): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    
    // 医疗开始音效 - 类似注射器的声音
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }
  
  // 播放医疗完成音效
  private playHealCompleteSound(): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    
    // 医疗完成音效 - 清脆的提示音
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523, ctx.currentTime); // C5
    osc1.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
    osc1.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523, ctx.currentTime + 0.3);
    osc2.frequency.setValueAtTime(659, ctx.currentTime + 0.4);
    osc2.frequency.setValueAtTime(784, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);
    osc2.start();
    osc2.stop(ctx.currentTime + 0.6);
  }
  
  // 更新血条UI
  private updateHealthUI(health: number, maxHealth: number): void {
    if (!this.healthFill || !this.healthText || !this.healthStatus || !this.healthDamage) return;
    
    const healthPercent = (health / maxHealth) * 100;
    
    // 更新血条填充
    this.healthFill.style.width = `${healthPercent}%`;
    
    // 根据血量设置颜色类
    this.healthFill.classList.remove('medium', 'low');
    if (healthPercent <= 25) {
      this.healthFill.classList.add('low');
      this.healthStatus!.classList.remove('medium');
      this.healthStatus!.classList.add('low');
      this.healthStatus!.textContent = 'CRITICAL';
    } else if (healthPercent <= 50) {
      this.healthFill.classList.add('medium');
      this.healthStatus!.classList.remove('low');
      this.healthStatus!.classList.add('medium');
      this.healthStatus!.textContent = 'LOW HEALTH';
    } else {
      this.healthStatus!.classList.remove('medium', 'low');
      this.healthStatus!.textContent = 'FULL HEALTH';
    }
    
    // 更新血量文字
    this.healthText.textContent = Math.max(0, health).toString();
    
    // 伤害延迟显示
    setTimeout(() => {
      if (this.healthDamage) {
        this.healthDamage.style.width = `${healthPercent}%`;
      }
    }, 300);
  }
  
  // 显示血屏效果
  private showBloodScreen(): void {
    if (!this.bloodScreen) return;
    
    const health = this.fpsController.getHealth();
    const maxHealth = this.fpsController.getMaxHealth();
    const healthPercent = health / maxHealth;
    
    // 血量越低，血屏越厚重
    const opacity = 1 - (healthPercent * 0.7); // 0.3 - 1.0
    const cssVar = `--blood-opacity: ${Math.max(0.3, opacity)}`;
    
    this.bloodScreen.style.setProperty('--blood-opacity', `${Math.max(0.3, opacity)}`);
    this.bloodScreen.classList.add('active');
    
    // 血屏闪烁效果
    if (healthPercent <= 25) {
      this.bloodScreen.style.animationDuration = '0.4s';
    } else if (healthPercent <= 50) {
      this.bloodScreen.style.animationDuration = '0.6s';
    } else {
      this.bloodScreen.style.animationDuration = '0.8s';
    }
    
    // 延迟隐藏血屏
    setTimeout(() => {
      if (!this.isDead) {
        this.bloodScreen!.classList.remove('active');
      }
    }, 500);
  }
  
  // 处理玩家死亡
  private handlePlayerDeath(): void {
    this.isDead = true;
    
    // 显示死亡屏幕
    if (this.deathScreen) {
      this.deathScreen.classList.add('active');
    }
    
    // 保持血屏效果
    if (this.bloodScreen) {
      this.bloodScreen.style.setProperty('--blood-opacity', '1');
      this.bloodScreen.classList.add('active');
    }
    
    // 释放鼠标锁定
    document.exitPointerLock();
  }
  
  // 复活玩家
  private respawnPlayer(): void {
    // 隐藏死亡屏幕
    if (this.deathScreen) {
      this.deathScreen.classList.remove('active');
    }
    
    // 隐藏血屏
    if (this.bloodScreen) {
      this.bloodScreen.classList.remove('active');
    }
    
    // 复活玩家
    const spawnPosition = new THREE.Vector3(0, 35, 400); // y=35是眼睛高度，脚底在y=0
    this.fpsController.respawn(spawnPosition);
    
    // 更新敌人玩家引用
    this.enemy.setPlayerRef(this.fpsController.getPosition());
    
    // 重置死亡状态
    this.isDead = false;
    
    // 更新血量UI
    this.updateHealthUI(100, 100);
    
    // 隐藏医疗UI
    this.hideHealingUI();
    this.hideMedkitPrompt();
    
    // 重新锁定鼠标
    this.renderer.domElement.requestPointerLock();
  }
  
  private setupWeaponControls(): void {
    // 武器切换
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Digit1') {
        this.switchWeapon(1);
      } else if (e.code === 'Digit2') {
        this.switchWeapon(2);
      } else if (e.code === 'Digit3') {
        this.switchWeapon(3);
      }
    });
  }
  
  private switchWeapon(slot: number): void {
    if (slot === this.currentWeaponSlot) return;
    
    const newWeapon = this.weapons.get(slot);
    if (!newWeapon) return;
    
    // 隐藏当前武器
    this.currentWeapon.getWeaponGroup().visible = false;
    
    // 显示新武器
    this.currentWeapon = newWeapon;
    this.currentWeaponSlot = slot;
    this.currentWeapon.getWeaponGroup().visible = true;
    
    // 同步当前鼠标状态到新武器
    this.currentWeapon.syncMouseState(this.isMouseDown);
    
    // 更新UI
    this.updateWeaponUI();
  }
  
  private updateWeaponUI(): void {
    const weaponName = document.querySelector('#weapon-info .weapon-name');
    const ammoDisplay = document.getElementById('ammo-display');
    const slotIndicator = document.getElementById('weapon-slot-indicator');
    
    if (weaponName) {
      weaponName.textContent = this.currentWeapon.getWeaponName();
    }
    
    if (slotIndicator) {
      const slots = slotIndicator.querySelectorAll('.slot');
      slots.forEach(slot => {
        const slotNum = parseInt((slot as HTMLElement).dataset.slot || '0');
        if (slotNum === this.currentWeaponSlot) {
          slot.classList.add('active');
        } else {
          slot.classList.remove('active');
        }
      });
    }
    
    if (ammoDisplay) {
      if (this.currentWeapon.isMelee()) {
        // 近战武器显示特殊图标
        ammoDisplay.innerHTML = `<span class="melee-icon">🔪</span>`;
        ammoDisplay.classList.remove('low', 'empty');
      } else {
        const current = this.currentWeapon.getCurrentAmmo();
        const max = this.currentWeapon.getMaxAmmo();
        ammoDisplay.innerHTML = `
          <span class="current">${current}</span><span class="separator">/</span><span class="max">${max}</span>
        `;
        
        // 更新弹药状态样式
        ammoDisplay.classList.remove('low', 'empty');
        if (current === 0) {
          ammoDisplay.classList.add('empty');
        } else if (current <= max * 0.3) {
          ammoDisplay.classList.add('low');
        }
      }
    }
  }
  
  // 启动指定关卡
  private startLevel(level: number): void {
    const config = LEVEL_CONFIGS[level - 1];
    if (!config) {
      console.error(`[Game] Invalid level: ${level}`);
      return;
    }
    
    console.log(`[Game] Starting Level ${level}: ${config.name}`);
    
    // 重置玩家状态（如果活着）
    if (!this.isDead) {
      const spawnPosition = new THREE.Vector3(0, 35, config.mapSize * 0.8);
      this.fpsController.respawn(spawnPosition);
    }
    
    // 配置关卡系统
    this.levelSystem.startLevel(level);
    
    // 配置地图
    this.dust2Map.setLevelConfig(config);
    
    // 配置敌人
    this.enemy.setLevelConfig(config);
    this.enemy.spawnEnemies(config.enemyCount);
    
    // 重新生成医疗包
    this.medkit.clearMedkits();
    this.medkit.spawnMedkits(Math.min(5, Math.floor(config.enemyCount / 3)));
    
    // 更新UI
    this.updateLevelUI();
    
    // 显示关卡开始提示
    this.showLevelStartMessage(level, config.name, config.description);
  }
  
  // 显示关卡开始提示
  private showLevelStartMessage(level: number, name: string, description: string): void {
    const message = document.getElementById('level-message');
    if (message) {
      message.innerHTML = `
        <div class="level-start">
          <div class="level-number">第 ${level} 关</div>
          <div class="level-name">${name}</div>
          <div class="level-desc">${description}</div>
        </div>
      `;
      message.style.opacity = '1';
      
      setTimeout(() => {
        message.style.opacity = '0';
      }, 3000);
    }
  }
  
  // 处理关卡完成
  private handleLevelComplete(): void {
    const currentLevel = this.levelSystem.getProgress().currentLevel;
    
    if (this.levelSystem.isGameComplete()) {
      // 游戏通关
      this.showGameCompleteMessage();
    } else {
      // 进入下一关
      setTimeout(() => {
        this.startLevel(currentLevel + 1);
      }, 2000);
    }
  }
  
  // 显示游戏通关信息
  private showGameCompleteMessage(): void {
    const message = document.getElementById('level-message');
    if (message) {
      message.innerHTML = `
        <div class="game-complete">
          <div class="complete-title">恭喜通关！</div>
          <div class="complete-subtitle">你已完成所有关卡</div>
        </div>
      `;
      message.style.opacity = '1';
      message.style.color = '#ffd700';
    }
  }
  
  // 更新关卡UI
  private updateLevelUI(): void {
    const progress = this.levelSystem.getProgress();
    const config = this.levelSystem.getCurrentLevelConfig();
    
    if (this.levelUI) {
      this.levelUI.innerHTML = `
        <div class="level-name">${config.name}</div>
        <div class="level-enemies">击杀: <span>${progress.totalKills} / ${progress.killTarget}</span></div>
        <div id="level-progress-container">
          <div id="level-progress-label">进度</div>
          <div id="level-progress">
            <div id="level-progress-fill"></div>
          </div>
        </div>
        <div id="level-target">目标: 击杀 ${progress.killTarget} 名敌人</div>
      `;
    }
    
    // 更新进度条
    const progressFill = document.getElementById('level-progress-fill');
    if (progressFill) {
      const percent = Math.min(100, (progress.totalKills / progress.killTarget) * 100);
      progressFill.style.width = `${percent}%`;
    }
    
    // 更新入口提示
    const portalHint = document.getElementById('portal-hint');
    if (portalHint) {
      if (progress.isPortalActive) {
        portalHint.classList.add('active');
      } else {
        portalHint.classList.remove('active');
      }
    }
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public start(): void {
    this.isRunning = true;
    this.updateWeaponUI();
    
    // 设置enemy的AudioContext
    if (this.audioCtx) {
      this.enemy.setAudioContext(this.audioCtx);
    }
    
    this.animate();
  }

  private handleShooting(): void {
    if (!this.currentWeapon.canShoot()) return;
    
    // 触发后座力
    this.fpsController.triggerRecoil();
    
    const enemyMeshes = this.enemy.getAllEnemyMeshes();
    const pellets = this.currentWeapon.getPellets();
    const damage = this.currentWeapon.getDamage();
    
    // 确定武器类型
    let weaponType: string = 'bullet';
    if (this.currentWeaponSlot === 2) weaponType = 'shotgun';
    else if (this.currentWeaponSlot === 3) weaponType = 'knife';
    
    if (pellets > 1) {
      // 霰弹枪多发子弹
      const spread = 0.08; // 散射范围
      const result = this.shootingSystem.shoot(enemyMeshes, pellets, spread);
      
      // 对每个命中计算伤害
      const hitSet = new Set<THREE.Object3D>();
      let killCount = 0;
      let wallHitCount = 0;
      
      for (const hit of result.hits) {
        if (hit.hit && hit.enemy) {
          if (!hitSet.has(hit.enemy)) {
            hitSet.add(hit.enemy);
            const killed = this.enemy.takeDamage(hit.enemy, damage);
            if (killed) {
              killCount++;
              this.levelSystem.onEnemyKilled(); // 通知关卡系统
            }
          }
        } else if (hit.wallHit) {
          wallHitCount++;
        }
      }
      
      // 散弹枪命中墙壁时添加多个贴花
      if (wallHitCount > 0) {
        this.addWallDecals(weaponType);
      }
      
      // 显示击杀标记
      if (killCount > 0) {
        this.showHitMarker();
        // 匕首命中播放击中音效
        if (this.currentWeaponSlot === 3 && 'playHitSound' in this.currentWeapon) {
          (this.currentWeapon as Knife).playHitSound();
        }
      }
    } else {
      // 单发射击
      const result = this.shootingSystem.shoot(enemyMeshes, 1, 0);
      
      if (result.hits.length > 0 && result.hits[0].enemy) {
        const killed = this.enemy.takeDamage(result.hits[0].enemy, damage);
        if (killed) {
          this.showHitMarker();
          this.levelSystem.onEnemyKilled(); // 通知关卡系统
        }
      } else if (result.hits[0]?.wallHit) {
        // 命中墙壁，添加贴花
        this.addSingleDecal(result.hits[0].point, result.hits[0].wallNormal!, weaponType);
      }
    }
    
    // 更新弹药UI
    this.updateWeaponUI();
  }
  
  // 添加单发射击的贴花
  private addSingleDecal(point: THREE.Vector3, normal: THREE.Vector3, type: string): void {
    this.decalSystem.addDecal(point, normal, type as any);
  }
  
  // 添加散弹枪命中的多个贴花
  private addWallDecals(type: string): void {
    const raycaster = new THREE.Raycaster();
    const screenCenter = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(screenCenter, this.camera);
    
    const wallMeshes = this.dust2Map.colliders;
    const hits = raycaster.intersectObjects(wallMeshes, true);
    
    if (hits.length > 0) {
      // 添加多个贴花散布在命中点周围
      for (let i = 0; i < 4; i++) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          0
        );
        const pos = hits[0].point.clone().add(offset);
        const normal = hits[0].face ? hits[0].face.normal.clone() : new THREE.Vector3(0, 1, 0);
        this.decalSystem.addDecal(pos, normal, type as any);
      }
    }
  }
  
  private showHitMarker(): void {
    const marker = document.createElement('div');
    marker.className = 'hit-marker';
    document.body.appendChild(marker);
    setTimeout(() => marker.remove(), 300);
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.animate);
    
    const delta = this.clock.getDelta();
    
    this.fpsController.update(delta, this.dust2Map.colliders);
    this.dust2Map.updateSky(this.camera.position);
    
    const walkTime = this.fpsController.walkTime;
    const breathTime = this.fpsController.breathTime;
    const isMoving = this.fpsController.isMoving();
    
    // 更新当前武器
    const didShoot = this.currentWeapon.update(delta, isMoving, walkTime, breathTime);
    
    if (didShoot) {
      this.handleShooting();
    }
    
    this.enemy.update(delta, this.fpsController.getPosition());
    
    // 更新关卡系统
    this.levelSystem.update(delta);
    
    // 检查进入入口
    if (this.levelSystem.checkPortalEnter(this.fpsController.getPosition())) {
      // 进入入口后的逻辑由handleLevelComplete处理
    }
    
    // 更新关卡UI
    this.updateLevelUI();
    
    // 更新敌人玩家引用
    this.enemy.setPlayerRef(this.fpsController.getPosition());
    
    // 更新医疗包
    this.medkit.update(delta);
    
    // 更新贴花系统
    this.decalSystem.update(delta);
    
    // 检查医疗状态
    this.fpsController.updateHealing(delta);
    this.updateHealingUI();
    
    // 检查附近医疗包
    const nearby = this.medkit.checkNearbyMedkit(this.fpsController.getPosition());
    this.nearbyMedkit = nearby;
    
    if (nearby && !this.fpsController.isCurrentlyHealing()) {
      this.showMedkitPrompt();
    } else if (!this.fpsController.isCurrentlyHealing()) {
      this.hideMedkitPrompt();
    }
    
    if (this.movementIndicator) {
      if (isMoving) {
        this.movementIndicator.classList.add('visible');
      } else {
        this.movementIndicator.classList.remove('visible');
      }
    }
    
    if (this.sprintIndicator) {
      if (this.fpsController.isSprinting()) {
        this.sprintIndicator.classList.add('visible');
      } else {
        this.sprintIndicator.classList.remove('visible');
      }
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}

const game = new Game();
console.log("[Game] Game instance created");

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
console.log("[Game] Start screen elements:", startScreen, startBtn);

if (startBtn && startScreen) {
  startBtn.addEventListener('click', () => {
    console.log("[Game] Start button clicked, calling game.start()");
    startScreen.classList.add('hidden');
    game.start();
  });
} else {
  console.error("[Game] Start screen or button not found");
}
