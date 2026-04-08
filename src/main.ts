import * as THREE from 'three';
import { FPSController } from './FPSController';
import { Dust2Map } from './Dust2Map';
import { AK47 } from './AK47';
import { Enemy } from './Enemy';
import { ShootingSystem } from './ShootingSystem';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private fpsController!: FPSController;
  private dust2Map!: Dust2Map;
  private ak47!: AK47;
  private enemy!: Enemy;
  private shootingSystem!: ShootingSystem;
  private clock: THREE.Clock;
  private isRunning = false;
  private movementIndicator!: HTMLElement | null;

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
    
    this.ak47 = new AK47(this.scene, this.camera);
    this.shootingSystem = new ShootingSystem(this.camera);
    
    this.enemy = new Enemy(this.scene);
    this.enemy.setColliders(this.dust2Map.colliders);
    this.enemy.spawnEnemies(6);
    
    this.movementIndicator = document.getElementById('movement-indicator');

    window.addEventListener('resize', () => this.onResize());
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
    this.animate();
  }

  private handleShooting(): void {
    // 检查AK47是否正在射击（鼠标按下且有子弹）
    if (!this.ak47.canShoot()) return;
    
    // 获取敌人网格进行射线检测
    const enemyMeshes = this.enemy.getAllEnemyMeshes();
    
    // 执行射线检测
    const hitResult = this.shootingSystem.shoot(enemyMeshes);
    
    if (hitResult.hit && hitResult.enemy) {
      // 命中敌人
      const killed = this.enemy.takeDamage(hitResult.enemy, this.ak47.getDamage());
      
      if (killed) {
        this.showHitMarker();
      }
    }
  }
  
  private showHitMarker(): void {
    const marker = document.createElement('div');
    marker.className = 'hit-marker';
    marker.innerHTML = '✕';
    marker.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ff0000;
      font-size: 30px;
      font-weight: bold;
      pointer-events: none;
      z-index: 101;
      text-shadow: 0 0 5px #ff0000;
      animation: hitMarkerFade 0.3s ease-out forwards;
    `;
    
    // 添加动画样式
    if (!document.getElementById('hit-marker-style')) {
      const style = document.createElement('style');
      style.id = 'hit-marker-style';
      style.textContent = `
        @keyframes hitMarkerFade {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
    
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
    
    // 更新武器（包含射击逻辑）
    const didShoot = this.ak47.update(delta, isMoving, walkTime, breathTime);
    
    // 如果武器刚刚发射了子弹，进行射线检测
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
