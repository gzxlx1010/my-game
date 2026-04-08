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
    this.scene.fog = new THREE.Fog(0xc9b896, 200, 1500);
  }

  private createGround(): void {
    // Main ground
    const groundGeometry = new THREE.PlaneGeometry(1600, 1600);
    const ground = new THREE.Mesh(groundGeometry, this.sandMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Road/path in the middle
    const roadGeometry = new THREE.PlaneGeometry(80, 800);
    const road = new THREE.Mesh(roadGeometry, this.wallMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.1, 0);
    road.receiveShadow = true;
    this.scene.add(road);
  }

  private createMainArea(): void {
    // Long wall A site (left side)
    this.createWall(-150, 0, -160, 400, 120, 20);
    
    // Short wall A site
    this.createWall(-360, 0, -60, 20, 80, 160);
    
    // Site A platform
    this.createPlatform(-280, 0, -200, 240, 200);
    
    // CT spawn area walls
    this.createWall(200, 0, -300, 300, 100, 20);
    this.createWall(360, 0, -200, 20, 80, 200);
    
    // B site walls
    this.createWall(-160, 0, 160, 20, 80, 240);
    this.createWall(160, 0, 160, 20, 80, 240);
    this.createWall(0, 0, 300, 360, 100, 20);
    
    // B site platform
    this.createPlatform(0, 0, 220, 360, 160);

    // Mid walls
    this.createWall(-100, 0, 0, 20, 60, 120);
    this.createWall(100, 0, 0, 20, 60, 120);
  }

  private createTunnels(): void {
    // A tunnel (left)
    this.createTunnel(-500, 0, -100, 160, 80, 400);
    
    // B tunnel (right) 
    this.createTunnel(500, 0, 100, 160, 80, 400);

    // Tunnel support pillars
    for (let i = 0; i < 8; i++) {
      this.createPillar(-440, 0, -200 + i * 60, 16, 80, 16);
      this.createPillar(440, 0, 200 - i * 60, 16, 80, 16);
    }
  }

  private createTunnel(x: number, y: number, z: number, width: number, height: number, depth: number): void {
    // Tunnel floor
    const floorGeo = new THREE.BoxGeometry(width, 10, depth);
    const floor = new THREE.Mesh(floorGeo, this.wallMaterial);
    floor.position.set(x, y + 5, z);
    floor.castShadow = true;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.colliders.push(floor);

    // Tunnel ceiling
    const ceilingGeo = new THREE.BoxGeometry(width, 10, depth);
    const ceiling = new THREE.Mesh(ceilingGeo, this.wallMaterial);
    ceiling.position.set(x, y + height - 5, z);
    ceiling.castShadow = true;
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);
    this.colliders.push(ceiling);

    // Tunnel walls
    const wallGeo1 = new THREE.BoxGeometry(10, height, depth);
    const wall1 = new THREE.Mesh(wallGeo1, this.wallMaterial);
    wall1.position.set(x - width/2 + 5, y + height/2, z);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene.add(wall1);
    this.colliders.push(wall1);

    const wallGeo2 = new THREE.BoxGeometry(10, height, depth);
    const wall2 = new THREE.Mesh(wallGeo2, this.wallMaterial);
    wall2.position.set(x + width/2 - 5, y + height/2, z);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    this.scene.add(wall2);
    this.colliders.push(wall2);
  }

  private createBombsites(): void {
    // A Site bombsite
    this.createSiteMarker(-280, 0.2, -240, "A");
    
    // B Site bombsite  
    this.createSiteMarker(0, 0.2, 220, "B");

    // Bombsite bombs (visual only)
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

  private createPlatforms(): void {
    // A site raised platform
    const aPlatGeo = new THREE.BoxGeometry(240, 40, 200);
    const aPlat = new THREE.Mesh(aPlatGeo, this.wallMaterial);
    aPlat.position.set(-280, 20, -200);
    aPlat.castShadow = true;
    aPlat.receiveShadow = true;
    this.scene.add(aPlat);
    this.colliders.push(aPlat);

    // B site raised platform
    const bPlatGeo = new THREE.BoxGeometry(360, 30, 160);
    const bPlat = new THREE.Mesh(bPlatGeo, this.wallMaterial);
    bPlat.position.set(0, 15, 220);
    bPlat.castShadow = true;
    bPlat.receiveShadow = true;
    this.scene.add(bPlat);
    this.colliders.push(bPlat);
  }

  private createRamps(): void {
    // A site ramp
    this.createRamp(-160, 0, -120, 80, 40, 60, 0);
    
    // B site ramps
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

  private createBoxes(): void {
    // Random boxes for cover
    const boxPositions = [
      { x: -200, z: -300 },
      { x: -360, z: -160 },
      { x: -400, z: 0 },
      { x: 300, z: 200 },
      { x: 400, z: -100 },
      { x: 0, z: -100 },
      { x: -100, z: 100 },
      { x: 100, z: 100 },
    ];

    boxPositions.forEach(pos => {
      this.createRandomBox(pos.x, 0, pos.z);
    });
  }

  private createRandomBox(x: number, y: number, z: number): void {
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
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    // Main sun light
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

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xaaaacc, 0.4);
    fillLight.position.set(-200, 200, -200);
    this.scene.add(fillLight);

    // Point lights for tunnels
    const tunnelLight1 = new THREE.PointLight(0xffaa55, 0.8, 200);
    tunnelLight1.position.set(-500, 70, -200);
    this.scene.add(tunnelLight1);

    const tunnelLight2 = new THREE.PointLight(0xffaa55, 0.8, 200);
    tunnelLight2.position.set(500, 70, 200);
    this.scene.add(tunnelLight2);
    
    // Hemisphere light for sky color
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xd4a574, 0.3);
    this.scene.add(hemiLight);
  }

  private addSkybox(): void {
    // Create gradient skybox
    const skyGeo = new THREE.SphereGeometry(1000, 32, 32);
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
