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
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x87ceeb);
    this.renderer.autoClear = true;
    this.renderer.autoClearColor = true;
    this.renderer.autoClearDepth = true;
    this.renderer.autoClearStencil = false;
    
    // Set scene background to match sky
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0xc9b896, 200, 1500);
    
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    // Create scene elements
    this.dust2Map = new Dust2Map(this.scene);
    
    // Camera starts at T spawn (bottom of map)
    const startPosition = new THREE.Vector3(0, 40, 400);
    this.fpsController = new FPSController(this.camera, startPosition);
    
    // Add camera to scene (needed for weapon attached to camera)
    this.scene.add(this.camera);
    
    // Create AK47 weapon (needs scene and camera)
    this.ak47 = new AK47(this.scene, this.camera);
    
    // Get movement indicator
    this.movementIndicator = document.getElementById('movement-indicator');

    // Handle resize
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

  private animate = (): void => {
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.animate);
    
    const delta = this.clock.getDelta();
    
    // Update FPS controller
    this.fpsController.update(delta, this.dust2Map.colliders);
    
    // Update skybox position to follow camera
    this.dust2Map.updateSky(this.camera.position);
    
    // Update weapon with animation times
    const walkTime = this.fpsController.walkTime;
    const breathTime = this.fpsController.breathTime;
    const isMoving = this.fpsController.isMoving();
    this.ak47.update(delta, isMoving, walkTime, breathTime);
    
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
