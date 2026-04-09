import * as THREE from 'three';

// 贴花类型
export type DecalType = 'bullet' | 'knife' | 'shotgun';

// 贴花数据
interface DecalData {
  mesh: THREE.Mesh;
  createdAt: number;
  lifetime: number;
  fadeStart: number;
}

// 贴花节点（链表结构）
class DecalNode {
  data: DecalData;
  next: DecalNode | null = null;
  
  constructor(data: DecalData) {
    this.data = data;
  }
}

export class DecalSystem {
  private scene: THREE.Scene;
  private head: DecalNode | null = null;
  private tail: DecalNode | null = null;
  private size = 0;
  
  private readonly MAX_DECALS = 100; // 最大贴花数量
  private readonly DEFAULT_LIFETIME = 10; // 默认存活时间10秒
  private readonly FADE_DURATION = 2; // 淡出时间
  
  // 弹孔纹理画布
  private bulletTexture: THREE.CanvasTexture | null = null;
  private knifeTexture: THREE.CanvasTexture | null = null;
  private shotgunTexture: THREE.CanvasTexture | null = null;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createTextures();
  }
  
  // 创建贴花纹理
  private createTextures(): void {
    // 子弹弹孔纹理
    this.bulletTexture = this.createBulletTexture();
    
    // 刀痕纹理
    this.knifeTexture = this.createKnifeTexture();
    
    // 散弹枪弹孔纹理（多个弹孔）
    this.shotgunTexture = this.createShotgunTexture();
  }
  
  // 创建子弹弹孔纹理
  private createBulletTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // 透明背景
    ctx.clearRect(0, 0, 64, 64);
    
    // 外圈深色
    ctx.beginPath();
    ctx.arc(32, 32, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 15, 10, 0.9)';
    ctx.fill();
    
    // 中圈裂纹
    ctx.beginPath();
    ctx.arc(32, 32, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40, 30, 20, 0.8)';
    ctx.fill();
    
    // 内圈
    ctx.beginPath();
    ctx.arc(32, 32, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 8, 5, 0.95)';
    ctx.fill();
    
    // 放射状裂纹
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.7)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(32 + Math.cos(angle) * 4, 32 + Math.sin(angle) * 4);
      ctx.lineTo(32 + Math.cos(angle) * 14, 32 + Math.sin(angle) * 14);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
  
  // 创建刀痕纹理
  private createKnifeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    // 透明背景
    ctx.clearRect(0, 0, 64, 64);
    
    // 划痕线条
    ctx.strokeStyle = 'rgba(30, 25, 20, 0.8)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // 主要划痕
    ctx.beginPath();
    ctx.moveTo(10, 50);
    ctx.lineTo(54, 14);
    ctx.stroke();
    
    // 次要划痕
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(40, 35, 30, 0.6)';
    ctx.beginPath();
    ctx.moveTo(14, 48);
    ctx.lineTo(50, 18);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(8, 46);
    ctx.lineTo(48, 12);
    ctx.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
  
  // 创建散弹枪弹孔纹理（多个弹孔）
  private createShotgunTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // 透明背景
    ctx.clearRect(0, 0, 128, 128);
    
    // 绘制多个弹孔
    const holes = [
      { x: 64, y: 64, r: 10 },
      { x: 48, y: 72, r: 8 },
      { x: 80, y: 56, r: 9 },
      { x: 56, y: 48, r: 7 },
      { x: 72, y: 76, r: 8 },
      { x: 44, y: 60, r: 6 },
      { x: 84, y: 68, r: 7 },
    ];
    
    for (const hole of holes) {
      // 外圈
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 15, 10, 0.9)';
      ctx.fill();
      
      // 内圈
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 8, 5, 0.95)';
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
  
  // 添加贴花
  public addDecal(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    type: DecalType = 'bullet'
  ): void {
    // 检查是否超过最大数量
    if (this.size >= this.MAX_DECALS) {
      this.removeOldestDecal();
    }
    
    // 选择纹理
    let texture: THREE.CanvasTexture;
    let size: number;
    
    switch (type) {
      case 'knife':
        texture = this.knifeTexture!;
        size = 15;
        break;
      case 'shotgun':
        texture = this.shotgunTexture!;
        size = 25;
        break;
      default:
        texture = this.bulletTexture!;
        size = 8;
    }
    
    // 创建贴花几何体
    const geometry = new THREE.PlaneGeometry(size, size);
    
    // 创建材质
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    
    // 创建贴花网格
    const mesh = new THREE.Mesh(geometry, material);
    
    // 设置位置和朝向
    mesh.position.copy(position);
    mesh.position.add(normal.clone().multiplyScalar(0.1)); // 稍微偏移避免Z-fighting
    
    // 让贴花朝向物体表面
    mesh.lookAt(position.clone().add(normal));
    
    // 添加到场景
    this.scene.add(mesh);
    
    // 创建贴花数据
    const now = performance.now() / 1000;
    const decalData: DecalData = {
      mesh,
      createdAt: now,
      lifetime: this.DEFAULT_LIFETIME,
      fadeStart: now + this.DEFAULT_LIFETIME - this.FADE_DURATION,
    };
    
    // 添加到链表
    const node = new DecalNode(decalData);
    
    if (this.tail) {
      this.tail.next = node;
      this.tail = node;
    } else {
      this.head = this.tail = node;
    }
    
    this.size++;
  }
  
  // 移除最旧的贴花
  private removeOldestDecal(): void {
    if (!this.head) return;
    
    const oldest = this.head;
    this.head = oldest.next;
    
    if (!this.head) {
      this.tail = null;
    }
    
    // 从场景移除并清理
    this.scene.remove(oldest.data.mesh);
    oldest.data.mesh.geometry.dispose();
    (oldest.data.mesh.material as THREE.Material).dispose();
    
    this.size--;
  }
  
  // 更新贴花（淡出效果）
  public update(deltaTime: number): void {
    const now = performance.now() / 1000;
    
    // 遍历链表，检查需要移除或淡出的贴花
    let current: DecalNode | null = this.head;
    let prev: DecalNode | null = null;
    
    while (current) {
      const decal = current.data;
      const age = now - decal.createdAt;
      
      // 检查是否超过存活时间
      if (age >= decal.lifetime) {
        // 从链表中移除
        if (prev) {
          prev.next = current.next;
        } else {
          this.head = current.next;
        }
        
        if (!current.next) {
          this.tail = prev;
        }
        
        // 移除并清理
        this.scene.remove(decal.mesh);
        decal.mesh.geometry.dispose();
        (decal.mesh.material as THREE.Material).dispose();
        
        this.size--;
        current = current.next;
      } else if (age >= decal.fadeStart) {
        // 淡出效果
        const fadeProgress = (age - decal.fadeStart) / this.FADE_DURATION;
        const opacity = 1 - fadeProgress;
        (decal.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, opacity);
        current = current.next;
      } else {
        current = current.next;
      }
    }
  }
  
  // 清理所有贴花
  public clear(): void {
    let current = this.head;
    
    while (current) {
      const decal = current.data;
      this.scene.remove(decal.mesh);
      decal.mesh.geometry.dispose();
      (decal.mesh.material as THREE.Material).dispose();
      current = current.next;
    }
    
    this.head = this.tail = null;
    this.size = 0;
  }
  
  // 获取当前贴花数量
  public getDecalCount(): number {
    return this.size;
  }
}
