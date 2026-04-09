import * as THREE from 'three';
import type { LevelConfig } from './LevelSystem';

export class Dust2Map {
  private scene: THREE.Scene;
  public colliders: THREE.Mesh[] = [];
  public sky: THREE.Mesh | null = null;
  
  private wallMaterial!: THREE.MeshStandardMaterial;
  private groundMaterial!: THREE.MeshStandardMaterial;
  private roadMaterial!: THREE.MeshStandardMaterial;
  private skyMat!: THREE.ShaderMaterial;
  
  private currentConfig: LevelConfig | null = null;
  private obstacles: THREE.Object3D[] = [];
  
  // 障碍物位置（根据关卡配置决定是否创建）
  private boxPositions = [
    { x: -200, z: -300 },
    { x: -360, z: -160 },
    { x: -400, z: 0 },
    { x: 300, z: 200 },
    { x: 400, z: -100 },
    { x: 0, z: -100 },
    { x: -100, z: 100 },
    { x: 100, z: 100 },
    { x: -500, z: -300 },
    { x: 500, z: 300 },
    { x: -300, z: 200 },
    { x: 300, z: -200 },
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createMaterials();
    this.addSkybox();
    this.addLighting();
  }
  
  public setLevelConfig(config: LevelConfig): void {
    this.currentConfig = config;
    
    // 更新地面颜色
    this.groundMaterial.color.setHex(config.groundColor);
    
    // 更新墙壁颜色（基于地面颜色的深色版本）
    const wallColor = this.darkenColor(config.groundColor, 0.7);
    this.wallMaterial.color.setHex(wallColor);
    
    // 更新道路颜色
    this.roadMaterial.color.setHex(this.darkenColor(config.groundColor, 0.85));
    
    // 更新天空颜色
    if (this.skyMat) {
      this.skyMat.uniforms.topColor.value.setHex(config.skyColor);
      this.skyMat.uniforms.bottomColor.value.setHex(this.darkenColor(config.skyColor, 0.6));
    }
    
    // 更新雾颜色
    this.scene.fog = new THREE.Fog(config.fogColor, 100, config.mapSize * 1.5);
    
    // 更新半球光
    this.scene.children = this.scene.children.filter(child => {
      if (child instanceof THREE.HemisphereLight) {
        child.color.setHex(config.skyColor);
        child.groundColor.setHex(config.groundColor);
        return true;
      }
      return true;
    });
    
    // 更新障碍物
    this.updateObstacles(config.hasObstacles);
    
    // 更新地面大小
    this.updateGroundSize(config.mapSize);
    
    console.log(`[Dust2Map] Level ${config.level} configured: ${config.name}`);
  }
  
  private darkenColor(color: number, factor: number): number {
    const r = ((color >> 16) & 255) * factor;
    const g = ((color >> 8) & 255) * factor;
    const b = (color & 255) * factor;
    return Math.floor(r) << 16 | Math.floor(g) << 8 | Math.floor(b);
  }
  
  private createMaterials(): void {
    // 墙壁材质（默认沙漠色）
    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.0
    });

    // 地面材质
    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xc2a366,
      roughness: 1.0,
      metalness: 0.0
    });
    
    // 道路材质
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: 0xa89060,
      roughness: 0.9,
      metalness: 0.0
    });
  }
  
  private updateGroundSize(size: number): void {
    // 移除旧的地面
    this.scene.children = this.scene.children.filter(child => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry instanceof THREE.PlaneGeometry && child.geometry.parameters) {
          const params = child.geometry.parameters;
          if (params.width > 500) return false; // 移除旧地面
        }
      }
      return true;
    });
    
    // 创建新地面
    const groundGeometry = new THREE.PlaneGeometry(size * 2, size * 2);
    const ground = new THREE.Mesh(groundGeometry, this.groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // 道路
    const roadSize = Math.min(size * 0.4, 150);
    const roadGeometry = new THREE.PlaneGeometry(roadSize, size * 2);
    const road = new THREE.Mesh(roadGeometry, this.roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.1, 0);
    road.receiveShadow = true;
    this.scene.add(road);
  }
  
  private updateObstacles(hasObstacles: boolean): void {
    // 移除旧障碍物
    this.obstacles.forEach(obj => {
      this.scene.remove(obj);
    });
    this.obstacles = [];
    
    // 从碰撞体中移除障碍物
    this.colliders = this.colliders.filter(collider => {
      return !this.obstacles.includes(collider);
    });
    
    if (!hasObstacles) return;
    
    // 创建新障碍物
    this.boxPositions.forEach(pos => {
      this.createObstacleBox(pos.x, 0, pos.z);
    });
  }
  
  private createObstacleBox(x: number, y: number, z: number): void {
    const size = 30 + Math.random() * 30;
    const height = 20 + Math.random() * 60;
    const boxGeo = new THREE.BoxGeometry(size, height, size);
    const box = new THREE.Mesh(boxGeo, this.wallMaterial);
    box.position.set(x + (Math.random() - 0.5) * 40, y + height/2, z + (Math.random() - 0.5) * 40);
    box.rotation.y = Math.random() * Math.PI;
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene.add(box);
    this.colliders.push(box);
    this.obstacles.push(box);
  }

  public createEnvironment(): void {
    // 已废弃，现在由setLevelConfig统一处理
  }

  public createGround(): void {
    // 已废弃，现在由setLevelConfig统一处理
  }

  public createMainArea(): void {
    // 长墙 A点（左侧）
    this.createWall(-150, 0, -160, 400, 120, 20);
    
    // 短墙 A点
    this.createWall(-360, 0, -60, 20, 80, 160);
    
    // A点平台
    this.createPlatform(-280, 0, -200, 240, 200);
    
    // CT出生点墙壁
    this.createWall(200, 0, -300, 300, 100, 20);
    this.createWall(360, 0, -200, 20, 80, 200);
    
    // B点墙壁
    this.createWall(-160, 0, 160, 20, 80, 240);
    this.createWall(160, 0, 160, 20, 80, 240);
    this.createWall(0, 0, 300, 360, 100, 20);
    
    // B点平台
    this.createPlatform(0, 0, 220, 360, 160);

    // 中路墙壁
    this.createWall(-100, 0, 0, 20, 60, 120);
    this.createWall(100, 0, 0, 20, 60, 120);
  }

  public createTunnels(): void {
    // A隧道（左侧）
    this.createTunnel(-500, 0, -100, 160, 80, 400);
    
    // B隧道（右侧） 
    this.createTunnel(500, 0, 100, 160, 80, 400);

    // 隧道支撑柱
    for (let i = 0; i < 8; i++) {
      this.createPillar(-440, 0, -200 + i * 60, 16, 80, 16);
      this.createPillar(440, 0, 200 - i * 60, 16, 80, 16);
    }
  }

  private createTunnel(x: number, y: number, z: number, width: number, height: number, depth: number): void {
    // 隧道顶部（仅视觉，无碰撞）
    const ceilingGeo = new THREE.BoxGeometry(width, 10, depth);
    const ceiling = new THREE.Mesh(ceilingGeo, this.wallMaterial);
    ceiling.position.set(x, y + height - 5, z);
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);

    // 隧道墙壁 - 碰撞体与视觉墙壁完全贴合
    const wallThickness = 10;
    const wallHeight = height;
    
    // 左侧墙壁
    const wallGeo1 = new THREE.BoxGeometry(wallThickness, wallHeight, depth);
    const wall1 = new THREE.Mesh(wallGeo1, this.wallMaterial);
    wall1.position.set(x - width/2 + wallThickness/2, y + wallHeight/2, z);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene.add(wall1);
    this.colliders.push(wall1);

    // 右侧墙壁
    const wallGeo2 = new THREE.BoxGeometry(wallThickness, wallHeight, depth);
    const wall2 = new THREE.Mesh(wallGeo2, this.wallMaterial);
    wall2.position.set(x + width/2 - wallThickness/2, y + wallHeight/2, z);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    this.scene.add(wall2);
    this.colliders.push(wall2);
  }

  public createBombsites(): void {
    // A点炸弹位置标记
    this.createSiteMarker(-280, 0.2, -240, "A");
    
    // B点炸弹位置标记
    this.createSiteMarker(0, 0.2, 220, "B");

    // 炸弹模型（仅视觉）
    this.createBomb(-280, 6, -230);
    this.createBomb(-290, 6, -250);
    this.createBomb(10, 6, 230);
    this.createBomb(-10, 6, 210);
  }

  private createSiteMarker(x: number, y: number, z: number, label: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const markerGeo = new THREE.PlaneGeometry(40, 40);
    const markerMat = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true,
      depthWrite: false
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(x, y, z);
    this.scene.add(marker);
  }

  private createBomb(x: number, y: number, z: number): void {
    const bombGeo = new THREE.BoxGeometry(12, 8, 12);
    const bombMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.3,
      metalness: 0.7
    });
    const bomb = new THREE.Mesh(bombGeo, bombMat);
    bomb.position.set(x, y, z);
    bomb.castShadow = true;
    this.scene.add(bomb);
  }

  public createPlatforms(): void {
    // A点高台
    const aPlatGeo = new THREE.BoxGeometry(240, 40, 200);
    const aPlat = new THREE.Mesh(aPlatGeo, this.wallMaterial);
    aPlat.position.set(-280, 20, -200);
    aPlat.castShadow = true;
    aPlat.receiveShadow = true;
    this.scene.add(aPlat);
    this.colliders.push(aPlat);

    // B点高台
    const bPlatGeo = new THREE.BoxGeometry(360, 30, 160);
    const bPlat = new THREE.Mesh(bPlatGeo, this.wallMaterial);
    bPlat.position.set(0, 15, 220);
    bPlat.castShadow = true;
    bPlat.receiveShadow = true;
    this.scene.add(bPlat);
    this.colliders.push(bPlat);
  }

  public createRamps(): void {
    // A点坡道
    this.createRamp(-160, 0, -120, 80, 40, 60, 0);
    
    // B点坡道
    this.createRamp(-140, 0, 120, 60, 30, 80, 0);
    this.createRamp(140, 0, 120, 60, 30, 80, 0);
  }

  private createRamp(x: number, y: number, z: number, width: number, height: number, depth: number, rotation: number): void {
    const rampShape = new THREE.Shape();
    rampShape.moveTo(0, 0);
    rampShape.lineTo(depth, 0);
    rampShape.lineTo(depth, height);
    rampShape.lineTo(0, 0);
    
    const extrudeSettings = {
      steps: 1,
      depth: width,
      bevelEnabled: false
    };
    
    const rampGeo = new THREE.ExtrudeGeometry(rampShape, extrudeSettings);
    const ramp = new THREE.Mesh(rampGeo, this.wallMaterial);
    ramp.rotation.y = rotation;
    ramp.position.set(x - width/2, y, z);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.scene.add(ramp);
    this.colliders.push(ramp);
  }

  public createBoxes(): void {
    // 随机掩体（仅当hasObstacles为true时由updateObstacles创建）
  }

  private createWall(x: number, y: number, z: number, width: number, height: number, depth: number): void {
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wall = new THREE.Mesh(wallGeo, this.wallMaterial);
    wall.position.set(x, y + height/2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    this.colliders.push(wall);
  }

  private createPillar(x: number, y: number, z: number, width: number, height: number, depth: number): void {
    const pillarGeo = new THREE.BoxGeometry(width, height, depth);
    const pillar = new THREE.Mesh(pillarGeo, this.wallMaterial);
    pillar.position.set(x, y + height/2, z);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.scene.add(pillar);
    this.colliders.push(pillar);
  }

  private createPlatform(x: number, y: number, z: number, width: number, depth: number): void {
    const platGeo = new THREE.BoxGeometry(width, 40, depth);
    const plat = new THREE.Mesh(platGeo, this.wallMaterial);
    plat.position.set(x, y + 20, z);
    plat.castShadow = true;
    plat.receiveShadow = true;
    this.scene.add(plat);
    this.colliders.push(plat);
  }

  private addLighting(): void {
    // 环境光
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    // 主阳光
    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    sunLight.position.set(200, 400, 200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 2000;
    sunLight.shadow.camera.left = -600;
    sunLight.shadow.camera.right = 600;
    sunLight.shadow.camera.top = 600;
    sunLight.shadow.camera.bottom = -600;
    this.scene.add(sunLight);

    // 补光
    const fillLight = new THREE.DirectionalLight(0xaaaacc, 0.4);
    fillLight.position.set(-200, 200, -200);
    this.scene.add(fillLight);

    // 隧道点光源
    const tunnelLight1 = new THREE.PointLight(0xffaa55, 0.8, 200);
    tunnelLight1.position.set(-500, 70, -200);
    this.scene.add(tunnelLight1);

    const tunnelLight2 = new THREE.PointLight(0xffaa55, 0.8, 200);
    tunnelLight2.position.set(500, 70, 200);
    this.scene.add(tunnelLight2);
    
    // 半球光（天空和地面颜色）
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xc2a366, 0.3);
    this.scene.add(hemiLight);
  }

  private addSkybox(): void {
    // 创建渐变天空盒
    const skyGeo = new THREE.SphereGeometry(1000, 32, 32);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x87ceeb) },
        bottomColor: { value: new THREE.Color(0xd4a574) },
        offset: { value: 20 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.sky = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.sky);
  }
  
  public updateSky(cameraPosition: THREE.Vector3): void {
    if (this.sky) {
      this.sky.position.copy(cameraPosition);
    }
  }
  
  public getWallMaterial(): THREE.MeshStandardMaterial {
    return this.wallMaterial;
  }
}
