import * as THREE from 'three';
import { FPSController } from './FPSController';
import { Dust2Map } from './Dust2Map';
import { AK47 } from './AK47';
import { Remington } from './Remington';
import { Knife } from './Knife';
import { Enemy } from './Enemy';
import { ShootingSystem } from './ShootingSystem';
import { Weapon } from './Weapon';

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
    
    const startPosition = new THREE.Vector3(0, 40, 400);
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
    this.enemy.spawnEnemies(6);
    
    this.movementIndicator = document.getElementById('movement-indicator');
    this.sprintIndicator = document.getElementById('sprint-indicator');

    window.addEventListener('resize', () => this.onResize());
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
    this.animate();
  }

  private handleShooting(): void {
    if (!this.currentWeapon.canShoot()) return;
    
    // 触发后座力
    this.fpsController.triggerRecoil();
    
    const enemyMeshes = this.enemy.getAllEnemyMeshes();
    const pellets = this.currentWeapon.getPellets();
    const damage = this.currentWeapon.getDamage();
    
    if (pellets > 1) {
      // 霰弹枪多发子弹
      const spread = 0.08; // 散射范围
      const result = this.shootingSystem.shoot(enemyMeshes, pellets, spread);
      
      // 对每个命中计算伤害
      const hitSet = new Set<THREE.Object3D>();
      let killCount = 0;
      
      for (const hit of result.hits) {
        if (hit.hit && hit.enemy) {
          if (!hitSet.has(hit.enemy)) {
            hitSet.add(hit.enemy);
            const killed = this.enemy.takeDamage(hit.enemy, damage);
            if (killed) killCount++;
          }
        }
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
        }
      }
    }
    
    // 更新弹药UI
    this.updateWeaponUI();
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

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

if (startBtn && startScreen) {
  startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    game.start();
  });
}
