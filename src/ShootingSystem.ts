import * as THREE from 'three';

export interface HitResult {
  hit: boolean;
  point: THREE.Vector3;
  enemy: THREE.Object3D | null;
  distance: number;
}

export interface MultiHitResult {
  hits: HitResult[];
  totalDamage: number;
}

export class ShootingSystem {
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private screenCenter: THREE.Vector2;
  private wallColliders: THREE.Mesh[] = [];
  
  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.screenCenter = new THREE.Vector2(0, 0);
  }
  
  public setWallColliders(colliders: THREE.Mesh[]): void {
    this.wallColliders = colliders;
  }
  
  private isWallBlocking(origin: THREE.Vector3, direction: THREE.Vector3, targetDistance: number): boolean {
    const wallMeshes = this.wallColliders.filter(mesh => !mesh.userData.isEnemy);
    const tempRaycaster = new THREE.Raycaster(origin, direction);
    const wallHits = tempRaycaster.intersectObjects(wallMeshes, true);
    
    if (wallHits.length > 0 && wallHits[0].distance < targetDistance) {
      return true;
    }
    return false;
  }
  
  public shoot(targets: THREE.Object3D[], pellets: number = 1, spread: number = 0.05): MultiHitResult {
    const hits: HitResult[] = [];
    const hitEnemies = new Set<THREE.Object3D>(); // 避免同一敌人被多次计算
    
    // 获取相机的前向向量
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    
    // 计算屏幕中心的射线
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const baseOrigin = this.raycaster.ray.origin.clone();
    const baseDirection = this.raycaster.ray.direction.clone();
    
    for (let i = 0; i < pellets; i++) {
      // 为每颗弹丸计算散射方向
      const spreadX = (Math.random() - 0.5) * 2 * spread;
      const spreadY = (Math.random() - 0.5) * 2 * spread;
      
      // 创建散射方向
      const spreadDirection = baseDirection.clone();
      
      // 使用相机右向量和上向量添加散射
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      right.crossVectors(cameraDirection, up).normalize();
      
      spreadDirection.add(right.multiplyScalar(spreadX));
      spreadDirection.add(up.multiplyScalar(spreadY));
      spreadDirection.normalize();
      
      // 设置射线
      this.raycaster.set(baseOrigin, spreadDirection);
      
      // 获取墙壁距离
      const wallMeshes = this.wallColliders.filter(mesh => !mesh.userData.isEnemy);
      const wallHits = this.raycaster.intersectObjects(wallMeshes, true);
      const wallDistance = wallHits.length > 0 ? wallHits[0].distance : Infinity;
      
      // 检测敌人
      const enemyHits = this.raycaster.intersectObjects(targets, true);
      
      if (enemyHits.length > 0) {
        const hit = enemyHits[0];
        
        // 检查墙壁阻挡
        if (hit.distance < wallDistance) {
          // 找到实际命中的敌人（可能是父级）
          let actualEnemy = hit.object;
          while (actualEnemy && !actualEnemy.userData.isEnemy && actualEnemy.parent) {
            actualEnemy = actualEnemy.parent;
          }
          
          hits.push({
            hit: true,
            point: hit.point.clone(),
            enemy: actualEnemy,
            distance: hit.distance
          });
        }
      }
    }
    
    // 计算总伤害（每颗弹丸独立计算伤害）
    let totalDamage = hits.length * 34; // 默认伤害，后续由Weapon传入
    
    return {
      hits,
      totalDamage
    };
  }
  
  // 简化版本：单发射击（保持向后兼容）
  public shootSingle(targets: THREE.Object3D[]): HitResult {
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    
    const wallMeshes = this.wallColliders.filter(mesh => !mesh.userData.isEnemy);
    const wallHits = this.raycaster.intersectObjects(wallMeshes, true);
    const wallDistance = wallHits.length > 0 ? wallHits[0].distance : Infinity;
    
    const enemyHits = this.raycaster.intersectObjects(targets, true);
    
    if (enemyHits.length > 0) {
      const hit = enemyHits[0];
      
      if (hit.distance < wallDistance) {
        return {
          hit: true,
          point: hit.point,
          enemy: hit.object,
          distance: hit.distance
        };
      }
    }
    
    return {
      hit: false,
      point: new THREE.Vector3(),
      enemy: null,
      distance: Infinity
    };
  }
  
  public getHitPoint(): THREE.Vector3 {
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion), 0);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, target);
    return target;
  }
}
