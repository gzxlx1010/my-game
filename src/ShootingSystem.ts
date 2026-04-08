import * as THREE from 'three';

export interface HitResult {
  hit: boolean;
  point: THREE.Vector3;
  enemy: THREE.Object3D | null;
  distance: number;
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
  
  public shoot(targets: THREE.Object3D[]): HitResult {
    // Set raycaster from camera center
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    
    // First, check if there are walls blocking the shot
    // Filter only wall colliders (not enemies)
    const wallMeshes = this.wallColliders.filter(mesh => !mesh.userData.isEnemy);
    const wallHits = this.raycaster.intersectObjects(wallMeshes, true);
    
    // Get wall distance (infinity if no wall hit)
    const wallDistance = wallHits.length > 0 ? wallHits[0].distance : Infinity;
    
    // Check intersections with enemy meshes
    const enemyHits = this.raycaster.intersectObjects(targets, true);
    
    if (enemyHits.length > 0) {
      const hit = enemyHits[0];
      
      // Only register hit if enemy is closer than any wall
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
