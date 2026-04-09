import * as THREE from 'three';

export interface MedkitData {
  mesh: THREE.Group;
  position: THREE.Vector3;
  isCollected: boolean;
  respawnTime: number;
}

export class Medkit {
  private scene: THREE.Scene;
  private medkits: MedkitData[] = [];
  private colliders: THREE.Mesh[] = [];
  
  private readonly MAX_MEDKITS = 5;
  private readonly INTERACTION_RANGE = 50; // 增加交互范围
  private readonly RESPAWN_TIME = 30; // 30秒后重生
  private readonly SPAWN_POINTS = [
    { x: -280, z: -240 },  // A site
    { x: 0, z: 220 },       // B site
    { x: -500, z: -100 },  // A tunnel
    { x: 500, z: 100 },     // B tunnel
    { x: 200, z: -300 },   // CT spawn
    { x: 0, z: 100 },      // Mid
    { x: -200, z: 400 },   // Long A
    { x: 300, z: 350 },    // T spawn
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setColliders(colliders: THREE.Mesh[]): void {
    this.colliders = colliders;
  }

  public spawnMedkits(count: number): void {
    for (let i = 0; i < count && this.medkits.length < this.MAX_MEDKITS; i++) {
      const spawnPoint = this.SPAWN_POINTS[i % this.SPAWN_POINTS.length];
      const medkit = this.createMedkit(spawnPoint.x, spawnPoint.z);
      this.medkits.push(medkit);
      this.scene.add(medkit.mesh);
    }
  }
  
  public clearMedkits(): void {
    for (const medkit of this.medkits) {
      this.scene.remove(medkit.mesh);
    }
    this.medkits = [];
  }

  private createMedkit(x: number, z: number): MedkitData {
    const group = new THREE.Group();
    
    // 医疗包主体 - 红色十字
    const boxGeo = new THREE.BoxGeometry(12, 4, 8);
    const boxMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      emissive: 0x330000,
      emissiveIntensity: 0.3
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 2;
    group.add(box);
    
    // 红色十字竖条
    const crossVGeo = new THREE.BoxGeometry(3, 6, 2);
    const crossVMat = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0x330000,
      emissiveIntensity: 0.3
    });
    const crossV = new THREE.Mesh(crossVGeo, crossVMat);
    crossV.position.y = 2;
    group.add(crossV);
    
    // 红色十字横条
    const crossHGeo = new THREE.BoxGeometry(8, 2, 2);
    const crossHMat = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0x330000,
      emissiveIntensity: 0.3
    });
    const crossH = new THREE.Mesh(crossHGeo, crossHMat);
    crossH.position.y = 2;
    group.add(crossH);
    
    // 底部圆盘
    const baseGeo = new THREE.CylinderGeometry(8, 10, 2, 16);
    const baseMat = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      emissive: 0x111111,
      emissiveIntensity: 0.2
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -1;
    group.add(base);
    
    // 发光效果
    const glowGeo = new THREE.RingGeometry(10, 14, 32);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0xff3333,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.1;
    glow.name = 'glow';
    group.add(glow);
    
    group.position.set(x, 0, z);
    group.userData.isMedkit = true;
    
    return {
      mesh: group,
      position: new THREE.Vector3(x, 0, z),
      isCollected: false,
      respawnTime: 0
    };
  }

  public update(delta: number): void {
    const time = performance.now() / 1000;
    
    for (const medkit of this.medkits) {
      if (medkit.isCollected) {
        // 检查是否需要重生
        if (time >= medkit.respawnTime) {
          this.respawnMedkit(medkit);
        }
        continue;
      }
      
      // 浮动动画
      medkit.mesh.position.y = 5 + Math.sin(time * 2) * 2;
      medkit.mesh.rotation.y += delta * 0.5;
      
      // 发光脉冲
      const glow = medkit.mesh.getObjectByName('glow') as THREE.Mesh;
      if (glow && glow.material) {
        const mat = glow.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3 + Math.sin(time * 3) * 0.2;
      }
    }
  }

  public checkNearbyMedkit(playerPos: THREE.Vector3): MedkitData | null {
    for (const medkit of this.medkits) {
      if (medkit.isCollected) continue;
      
      const dist = playerPos.distanceTo(medkit.position);
      if (dist <= this.INTERACTION_RANGE) {
        return medkit;
      }
    }
    return null;
  }

  public collectMedkit(medkit: MedkitData): void {
    medkit.isCollected = true;
    medkit.mesh.visible = false;
    medkit.respawnTime = performance.now() / 1000 + this.RESPAWN_TIME;
  }

  private respawnMedkit(medkit: MedkitData): void {
    medkit.isCollected = false;
    medkit.mesh.visible = true;
  }

  public getAllMeshes(): THREE.Group[] {
    return this.medkits.map(m => m.mesh);
  }
}
