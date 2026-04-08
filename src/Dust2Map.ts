import * as THREE from 'three';

export class Dust2Map {
  private scene: THREE.Scene;
  public colliders: THREE.Mesh[] = [];
  
  private wallMaterial!: THREE.MeshStandardMaterial;
  private sandMaterial!: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createMaterials();
    this.createEnvironment();
    this.createGround();
    this.createMainArea();
    this.createTunnels();
    this.createBombsites();
    this.createPlatforms();
    this.createRamps();
    this.createBoxes();
    this.addLighting();
    this.addSkybox();
  }

  private createMaterials(): void {
    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xc9b896,
      roughness: 0.8,
      metalness: 0.0
    });

    this.sandMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 1.0,
      metalness: 0.0
    });
  }

  private createEnvironment(): void {
    // Fog for atmosphere
    this.scene.fog = new THREE.Fog(0xc9b896, 100, 800);
  }

  private createGround(): void {
    // Main ground
    const groundGeometry = new THREE.PlaneGeometry(800, 800);
    const ground = new THREE.Mesh(groundGeometry, this.sandMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Road/path in the middle
    const roadGeometry = new THREE.PlaneGeometry(40, 400);
    const road = new THREE.Mesh(roadGeometry, this.wallMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.1, 0);
    road.receiveShadow = true;
    this.scene.add(road);
  }

  private createMainArea(): void {
    // Long wall A site (left side)
    this.createWall(-100, 0, -80, 200, 60, 10);
    
    // Short wall A site
    this.createWall(-180, 0, -30, 10, 40, 80);
    
    // Site A platform
    this.createPlatform(-140, 0, -100, 120, 100);
    
    // CT spawn area walls
    this.createWall(100, 0, -150, 150, 50, 10);
    this.createWall(180, 0, -100, 10, 40, 100);
    
    // B site walls
    this.createWall(-80, 0, 80, 10, 40, 120);
    this.createWall(80, 0, 80, 10, 40, 120);
    this.createWall(0, 0, 150, 180, 50, 10);
    
    // B site platform
    this.createPlatform(0, 0, 110, 180, 80);

    // Mid walls
    this.createWall(-50, 0, 0, 10, 30, 60);
    this.createWall(50, 0, 0, 10, 30, 60);
  }

  private createTunnels(): void {
    // A tunnel (left)
    this.createTunnel(-250, 0, -50, 80, 40, 200);
    
    // B tunnel (right) 
    this.createTunnel(250, 0, 50, 80, 40, 200);

    // Tunnel support pillars
    for (let i = 0; i < 5; i++) {
      this.createPillar(-220, 0, -100 + i * 50, 8, 40, 8);
      this.createPillar(220, 0, 100 - i * 50, 8, 40, 8);
    }
  }

  private createTunnel(x: number, y: number, z: number, width: number, height: number, depth: number): void {
    // Tunnel floor
    const floorGeo = new THREE.BoxGeometry(width, 5, depth);
    const floor = new THREE.Mesh(floorGeo, this.wallMaterial);
    floor.position.set(x, y + 2.5, z);
    floor.castShadow = true;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.colliders.push(floor);

    // Tunnel ceiling
    const ceilingGeo = new THREE.BoxGeometry(width, 5, depth);
    const ceiling = new THREE.Mesh(ceilingGeo, this.wallMaterial);
    ceiling.position.set(x, y + height - 2.5, z);
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);
    this.colliders.push(ceiling);

    // Tunnel walls
    const wallGeo1 = new THREE.BoxGeometry(5, height, depth);
    const wall1 = new THREE.Mesh(wallGeo1, this.wallMaterial);
    wall1.position.set(x - width/2 + 2.5, y + height/2, z);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene.add(wall1);
    this.colliders.push(wall1);

    const wallGeo2 = new THREE.BoxGeometry(5, height, depth);
    const wall2 = new THREE.Mesh(wallGeo2, this.wallMaterial);
    wall2.position.set(x + width/2 - 2.5, y + height/2, z);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    this.scene.add(wall2);
    this.colliders.push(wall2);
  }

  private createBombsites(): void {
    // A Site bombsite
    this.createSiteMarker(-140, 0.2, -120, "A");
    
    // B Site bombsite  
    this.createSiteMarker(0, 0.2, 110, "B");

    // Bombsite bombs (visual only)
    this.createBomb(-140, 3, -115);
    this.createBomb(-145, 3, -125);
    this.createBomb(5, 3, 115);
    this.createBomb(-5, 3, 105);
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
    const markerGeo = new THREE.PlaneGeometry(20, 20);
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
    const bombGeo = new THREE.BoxGeometry(6, 4, 6);
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

  private createPlatforms(): void {
    // A site raised platform
    const aPlatGeo = new THREE.BoxGeometry(120, 20, 100);
    const aPlat = new THREE.Mesh(aPlatGeo, this.wallMaterial);
    aPlat.position.set(-140, 10, -100);
    aPlat.castShadow = true;
    aPlat.receiveShadow = true;
    this.scene.add(aPlat);
    this.colliders.push(aPlat);

    // B site raised platform
    const bPlatGeo = new THREE.BoxGeometry(180, 15, 80);
    const bPlat = new THREE.Mesh(bPlatGeo, this.wallMaterial);
    bPlat.position.set(0, 7.5, 110);
    bPlat.castShadow = true;
    bPlat.receiveShadow = true;
    this.scene.add(bPlat);
    this.colliders.push(bPlat);
  }

  private createRamps(): void {
    // A site ramp
    this.createRamp(-80, 0, -60, 40, 20, 30, 0);
    
    // B site ramps
    this.createRamp(-70, 0, 60, 30, 15, 40, 0);
    this.createRamp(70, 0, 60, 30, 15, 40, 0);
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

  private createBoxes(): void {
    // Random boxes for cover
    const boxPositions = [
      { x: -100, z: -150 },
      { x: -180, z: -80 },
      { x: -200, z: 0 },
      { x: 150, z: 100 },
      { x: 200, z: -50 },
      { x: 0, z: -50 },
      { x: -50, z: 50 },
      { x: 50, z: 50 },
    ];

    boxPositions.forEach(pos => {
      this.createRandomBox(pos.x, 0, pos.z);
    });
  }

  private createRandomBox(x: number, y: number, z: number): void {
    const size = 15 + Math.random() * 15;
    const height = 10 + Math.random() * 30;
    const boxGeo = new THREE.BoxGeometry(size, height, size);
    const box = new THREE.Mesh(boxGeo, this.wallMaterial);
    box.position.set(x + (Math.random() - 0.5) * 20, y + height/2, z + (Math.random() - 0.5) * 20);
    box.rotation.y = Math.random() * Math.PI;
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene.add(box);
    this.colliders.push(box);
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
    const platGeo = new THREE.BoxGeometry(width, 20, depth);
    const plat = new THREE.Mesh(platGeo, this.wallMaterial);
    plat.position.set(x, y + 10, z);
    plat.castShadow = true;
    plat.receiveShadow = true;
    this.scene.add(plat);
    this.colliders.push(plat);
  }

  private addLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Main sun light
    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    sunLight.position.set(100, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 1000;
    sunLight.shadow.camera.left = -300;
    sunLight.shadow.camera.right = 300;
    sunLight.shadow.camera.top = 300;
    sunLight.shadow.camera.bottom = -300;
    this.scene.add(sunLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xaaaacc, 0.3);
    fillLight.position.set(-100, 100, -100);
    this.scene.add(fillLight);

    // Point lights for tunnels
    const tunnelLight1 = new THREE.PointLight(0xffaa55, 0.5, 100);
    tunnelLight1.position.set(-250, 35, -100);
    this.scene.add(tunnelLight1);

    const tunnelLight2 = new THREE.PointLight(0xffaa55, 0.5, 100);
    tunnelLight2.position.set(250, 35, 100);
    this.scene.add(tunnelLight2);
  }

  private addSkybox(): void {
    // Create gradient skybox
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
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
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }
}
