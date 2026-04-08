import * as THREE from 'three';
import { FPSController } from './FPSController';
import { Dust2Map } from './Dust2Map';
import { AK47 } from './AK47';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private fpsController!: FPSController;
  private dust2Map!: Dust2Map;
  private ak47!: AK47;
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
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    // Create scene elements
    this.dust2Map = new Dust2Map(this.scene);
    
    // Camera starts at T spawn (bottom of map)
    const startPosition = new THREE.Vector3(0, 60, 200);
    this.fpsController = new FPSController(this.camera, startPosition);
    
    // Create AK47 weapon (needs scene and camera)
    this.ak47 = new AK47(this.scene, this.camera);
    
    // Get movement indicator
    this.movementIndicator = document.getElementById('movement-indicator');

    // Handle resize
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public start(): void {
    this.isRunning = true;
    this.animate();
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.animate);
    
    const delta = this.clock.getDelta();
    
    // Update FPS controller
    this.fpsController.update(delta, this.dust2Map.colliders);
    
    // Update weapon with animation times
    const walkTime = this.fpsController.walkTime;
    const breathTime = this.fpsController.breathTime;
    const isMoving = this.fpsController.isMoving();
    this.ak47.update(delta, isMoving, walkTime, breathTime, this.camera);
    
    // Update movement indicator
    if (this.movementIndicator) {
      if (isMoving) {
        this.movementIndicator.classList.add('visible');
      } else {
        this.movementIndicator.classList.remove('visible');
      }
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize game when DOM is ready
const game = new Game();

// Handle start button
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

if (startBtn && startScreen) {
  startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    game.start();
  });
}
