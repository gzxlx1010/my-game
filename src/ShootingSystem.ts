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
  
  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.screenCenter = new THREE.Vector2(0, 0);
  }
  
  public shoot(targets: THREE.Object3D[]): HitResult {
    // Set raycaster from camera center
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    
    // Check intersections with enemy meshes
    const intersects = this.raycaster.intersectObjects(targets, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      return {
        hit: true,
        point: hit.point,
        enemy: hit.object,
        distance: hit.distance
      };
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
