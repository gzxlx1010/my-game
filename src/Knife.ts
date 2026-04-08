import * as THREE from 'three';
import type { WeaponConfig } from './Weapon';
import { Weapon } from './Weapon';

export const KNIFE_CONFIG: WeaponConfig = {
  name: 'Karambit',
  fireRate: 0.4,  // 划刀间隔
  damage: 65,     // 匕首伤害（一刀半血，两刀击杀）
  maxAmmo: 0,    // 近战武器无弹药
  reloadTime: 0,  // 无需换弹
};

export class Knife extends Weapon {
  public config = KNIFE_CONFIG;
  
  private readonly BASE_POSITION = new THREE.Vector3(0.2, -0.25, -0.2);
  private readonly BASE_ROTATION = new THREE.Euler(-0.3, 0.1, -0.5);
  
  private isSlashing = false;
  private slashProgress = 0;
  private slashDuration = 0.3;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super(scene, camera);
    this.currentAmmo = 0;
    this.maxAmmo = 0;
    this.createModel();
    this.setupControls();
    camera.add(this.weaponGroup);
  }
  
  public createModel(): void {
    const bladeMat = new THREE.MeshStandardMaterial({ 
      color: 0xc0c0c0, 
      roughness: 0.2, 
      metalness: 0.95 
    });
    const handleMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a, 
      roughness: 0.5, 
      metalness: 0.3 
    });
    const accentMat = new THREE.MeshStandardMaterial({ 
      color: 0xff3e3e, 
      roughness: 0.3, 
      metalness: 0.6 
    });

    // Blade (curved karambit shape)
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.bezierCurveTo(0.02, 0.05, 0.04, 0.1, 0.03, 0.15);
    bladeShape.bezierCurveTo(0.02, 0.18, -0.01, 0.2, -0.02, 0.22);
    bladeShape.bezierCurveTo(-0.03, 0.18, -0.02, 0.1, 0, 0);
    
    const extrudeSettings = {
      steps: 1,
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 3
    };
    
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0, 0, 0);
    this.weaponGroup.add(blade);

    // Blade spine (top edge)
    const spineGeo = new THREE.BoxGeometry(0.005, 0.01, 0.15);
    const spine = new THREE.Mesh(spineGeo, bladeMat);
    spine.position.set(0.015, 0.005, 0.08);
    spine.rotation.x = -0.2;
    this.weaponGroup.add(spine);

    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.015, 0.012, 0.1, 8);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 0, -0.05);
    handle.rotation.x = Math.PI / 2;
    this.weaponGroup.add(handle);

    // Handle wrap pattern
    for (let i = 0; i < 5; i++) {
      const wrapGeo = new THREE.TorusGeometry(0.014, 0.003, 6, 12);
      const wrap = new THREE.Mesh(wrapGeo, accentMat);
      wrap.position.set(0, 0, -0.02 - i * 0.015);
      wrap.rotation.x = Math.PI / 2;
      this.weaponGroup.add(wrap);
    }

    // Guard
    const guardGeo = new THREE.TorusGeometry(0.02, 0.004, 8, 16);
    const guard = new THREE.Mesh(guardGeo, bladeMat);
    guard.position.set(0, 0, 0.01);
    guard.rotation.x = Math.PI / 2;
    this.weaponGroup.add(guard);

    // Finger ring (karambit distinctive feature)
    const ringGeo = new THREE.TorusGeometry(0.018, 0.004, 8, 16);
    const ring = new THREE.Mesh(ringGeo, bladeMat);
    ring.position.set(0.015, 0.01, -0.08);
    this.weaponGroup.add(ring);

    // Blade tip
    const tipGeo = new THREE.ConeGeometry(0.008, 0.02, 6);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.set(0.01, 0.005, 0.22);
    tip.rotation.x = Math.PI / 2 + 0.3;
    this.weaponGroup.add(tip);

    this.weaponGroup.position.copy(this.BASE_POSITION);
    this.weaponGroup.rotation.copy(this.BASE_ROTATION);
  }
  
  public canShoot(): boolean {
    if (this.isSlashing) return false;
    return this.isMouseDown;
  }
  
  public update(delta: number, isMoving: boolean, walkTime: number, breathTime: number): boolean {
    this.time += delta;
    this.walkTime += delta;
    this.breathTime += delta;
    
    let didShoot = false;
    
    // Auto fire for melee
    if (this.isMouseDown && !this.isSlashing) {
      const currentTime = performance.now() / 1000;
      if (currentTime - this.lastShotTime >= this.config.fireRate) {
        this.lastShotTime = currentTime;
        this.slash();
        didShoot = true;
      }
    }
    
    // 划刀动画
    if (this.isSlashing) {
      this.slashProgress += delta / this.slashDuration;
      
      if (this.slashProgress >= 1) {
        this.slashProgress = 0;
        this.isSlashing = false;
      }
      
      // 划刀动画：旋转+前探
      const slashAngle = Math.sin(this.slashProgress * Math.PI) * 0.8;
      const slashForward = Math.sin(this.slashProgress * Math.PI) * 0.1;
      
      this.weaponGroup.position.z = this.BASE_POSITION.z + slashForward;
      this.weaponGroup.rotation.z = this.BASE_ROTATION.z + slashAngle;
      this.weaponGroup.rotation.x = this.BASE_ROTATION.x - slashAngle * 0.3;
    } else {
      // 非攻击状态平滑恢复
      this.weaponGroup.position.x += (this.BASE_POSITION.x - this.weaponGroup.position.x) * 0.15;
      this.weaponGroup.position.y += (this.BASE_POSITION.y - this.weaponGroup.position.y) * 0.15;
      this.weaponGroup.position.z += (this.BASE_POSITION.z - this.weaponGroup.position.z) * 0.15;
      
      this.weaponGroup.rotation.x += (this.BASE_ROTATION.x - this.weaponGroup.rotation.x) * 0.15;
      this.weaponGroup.rotation.y += (this.BASE_ROTATION.y - this.weaponGroup.rotation.y) * 0.15;
      this.weaponGroup.rotation.z += (this.BASE_ROTATION.z - this.weaponGroup.rotation.z) * 0.15;
      
      // 近战武器待机时的轻微摆动
      const idleSway = Math.sin(this.time * 2) * 0.02;
      this.weaponGroup.rotation.y += idleSway;
    }
    
    // 无弹药显示
    this.updateAmmoDisplay();
    
    return didShoot;
  }
  
  private slash(): void {
    this.isSlashing = true;
    this.slashProgress = 0;
    this.playSlashSound();
  }
  
  public playSlashSound(): void {
    const audioCtx = this.audioCtx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (!this.audioCtx) this.audioCtx = audioCtx;
    
    // 匕首划过的空气声
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.25);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // 快速划过的高频音
      const whoosh = Math.sin(t * 3000 * Math.PI) * Math.exp(-t * 8) * 0.3;
      // 金属质感
      const metal = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.2;
      // 尖锐的呼啸
      const slice = Math.sin(t * 1500 * Math.PI) * Math.exp(-t * 6) * 0.4;
      
      data[i] = whoosh + metal + slice;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 500;
    
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4000;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    
    noise.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start(audioCtx.currentTime);
    noise.stop(audioCtx.currentTime + 0.25);
  }
  
  public playHitSound(): void {
    const audioCtx = this.audioCtx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (!this.audioCtx) this.audioCtx = audioCtx;
    
    // 刀刺入的沉闷声
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc1.start(audioCtx.currentTime);
    osc2.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.15);
    osc2.stop(audioCtx.currentTime + 0.15);
  }
  
  public isSlashingNow(): boolean {
    return this.isSlashing;
  }
  
  protected updateWeaponPosition(isMoving: boolean): void {
    // 近战武器不需要复杂的步伐动画
    // 保持在基础位置即可
  }
  
  public reload(): void {
    // 近战武器无换弹动作
  }
}
