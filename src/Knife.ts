import * as THREE from 'three';
import type { WeaponConfig } from './Weapon';
import { Weapon } from './Weapon';

export const KNIFE_CONFIG: WeaponConfig = {
  name: 'Knife',
  fireRate: 0.5,  // 划刀间隔
  damage: 65,     // 一刀65伤害，两刀击杀
  maxAmmo: 0,     // 近战武器无弹药
  reloadTime: 0
};

export class Knife extends Weapon {
  public config = KNIFE_CONFIG;
  
  private readonly BASE_POSITION = new THREE.Vector3(0.18, -0.15, -0.25);
  private readonly BASE_ROTATION = new THREE.Euler(-0.3, 0.1, -0.1);
  
  // 划刀动画状态
  private isSwinging = false;
  private swingTime = 0;
  private readonly SWING_DURATION = 0.25;
  private readonly SWING_LIFT = 0.25;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super(scene, camera);
    this.currentAmmo = 0;  // 近战武器无弹药
    this.maxAmmo = 0;
    this.createModel();
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
    const edgeMat = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      roughness: 0.1, 
      metalness: 1.0 
    });

    // Blade body
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.25), bladeMat);
    blade.position.set(0, 0.01, -0.05);
    blade.rotation.x = -0.1;
    this.weaponGroup.add(blade);

    // Blade tip (pointed)
    const tipGeo = new THREE.ConeGeometry(0.012, 0.08, 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.set(0, 0.01, -0.22);
    tip.rotation.x = -0.1;
    tip.rotation.z = Math.PI / 4;
    this.weaponGroup.add(tip);

    // Blade edge (sharp line)
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.001, 0.28), edgeMat);
    edge.position.set(0.008, 0.01, -0.06);
    edge.rotation.x = -0.1;
    this.weaponGroup.add(edge);

    // Handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.1), handleMat);
    handle.position.set(0, 0, 0.1);
    handle.rotation.x = 0.05;
    this.weaponGroup.add(handle);

    // Handle wrap pattern
    const wrapGeo = new THREE.TorusGeometry(0.012, 0.003, 4, 12);
    for (let i = 0; i < 4; i++) {
      const wrap = new THREE.Mesh(wrapGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
      wrap.position.set(0, 0, 0.07 + i * 0.02);
      wrap.rotation.x = Math.PI / 2;
      this.weaponGroup.add(wrap);
    }

    // Handle guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 0.015), bladeMat);
    guard.position.set(0, 0.005, 0.05);
    this.weaponGroup.add(guard);

    // Blade fuller (groove)
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.002, 0.18), new THREE.MeshStandardMaterial({ color: 0x808080 }));
    fuller.position.set(-0.003, 0.015, -0.05);
    fuller.rotation.x = -0.1;
    this.weaponGroup.add(fuller);

    this.weaponGroup.position.copy(this.BASE_POSITION);
    this.weaponGroup.rotation.copy(this.BASE_ROTATION);
  }
  
  public canShoot(): boolean {
    return this.getMouseDown() && !this.isSwinging;
  }
  
  public shoot(): boolean {
    if (this.isSwinging) return false;
    this.isSwinging = true;
    this.swingTime = 0;
    this.playShotSound();
    return true;
  }
  
  public playShotSound(): void {
    this.playSwingSound();
  }
  
  private playSwingSound(): void {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    
    // 匕首划动的声音
    const bufferSize = Math.floor(ctx.sampleRate * 0.2);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // 快速的嗖声
      const whoosh = (Math.random() * 2 - 1) * Math.exp(-t * 12);
      // 低频挥动
      const sweep = Math.sin(t * 2000 * Math.PI * (1 - t * 0.5)) * Math.exp(-t * 8);
      
      data[i] = whoosh * 0.3 + sweep * 0.5;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.2);
  }
  
  public playHitSound(): void {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    
    // 击中音效
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noise = ctx.createBufferSource();
    
    // 冲击声
    const bufferSize = Math.floor(ctx.sampleRate * 0.1);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const noiseData = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30);
    }
    
    noise.buffer = buffer;
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    
    osc.connect(filter);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.1);
  }
  
  public playReloadSound(): void {
    // 近战武器无换弹音效
  }
  
  public update(delta: number, isMoving: boolean, walkTime: number, breathTime: number): boolean {
    this.time += delta;
    this.walkTime = walkTime;
    this.breathTime = breathTime;
    
    let didShoot = false;
    
    // Auto swing
    if (this.getMouseDown() && !this.isReloading) {
      const currentTime = performance.now() / 1000;
      if (currentTime - this.lastShotTime >= this.config.fireRate) {
        if (!this.isSwinging) {
          this.lastShotTime = currentTime;
          didShoot = this.shoot();
        }
      }
    }
    
    // 划刀动画
    if (this.isSwinging) {
      this.swingTime += delta;
      const progress = this.swingTime / this.SWING_DURATION;
      
      if (progress < 1) {
        // 划刀动画：快速挥动
        // 0-30%: 向上挥动
        // 30-70%: 保持在顶部
        // 70-100%: 收回
        if (progress < 0.3) {
          const t = progress / 0.3;
          this.recoilAmount = Math.sin(t * Math.PI * 0.5) * this.SWING_LIFT;
        } else if (progress < 0.7) {
          this.recoilAmount = this.SWING_LIFT * (1 - (progress - 0.3) / 0.4 * 0.3);
        } else {
          const t = (progress - 0.7) / 0.3;
          this.recoilAmount = this.SWING_LIFT * 0.7 * (1 - t * t);
        }
      } else {
        this.isSwinging = false;
        this.recoilAmount = 0;
      }
    }
    
    this.updateWeaponPosition(isMoving);
    return didShoot;
  }
  
  protected updateWeaponPosition(isMoving: boolean): void {
    const walkSpeed = 12;
    const bobX = Math.sin(this.walkTime * walkSpeed) * 0.015 * (isMoving ? 1 : 0.15);
    const bobY = Math.abs(Math.cos(this.walkTime * walkSpeed)) * 0.02 * (isMoving ? 1 : 0.15);
    
    const breathSwayX = Math.sin(this.breathTime) * 0.002;
    const breathSwayY = Math.cos(this.breathTime * 0.7) * 0.0015;
    
    // 划刀时上扬
    const swingLift = this.recoilAmount;
    const swingRot = this.recoilAmount * 1.5;
    
    const targetX = this.BASE_POSITION.x + bobX + breathSwayX;
    const targetY = this.BASE_POSITION.y - bobY + breathSwayY + swingLift;
    const targetZ = this.BASE_POSITION.z;
    
    this.weaponGroup.position.x += (targetX - this.weaponGroup.position.x) * 0.2;
    this.weaponGroup.position.y += (targetY - this.weaponGroup.position.y) * 0.2;
    this.weaponGroup.position.z += (targetZ - this.weaponGroup.position.z) * 0.2;
    
    const targetRotX = this.BASE_ROTATION.x + swingRot;
    const targetRotY = this.BASE_ROTATION.y + bobX * 0.3;
    const targetRotZ = this.BASE_ROTATION.z + bobX * 0.5;
    
    this.weaponGroup.rotation.x += (targetRotX - this.weaponGroup.rotation.x) * 0.2;
    this.weaponGroup.rotation.y += (targetRotY - this.weaponGroup.rotation.y) * 0.2;
    this.weaponGroup.rotation.z += (targetRotZ - this.weaponGroup.rotation.z) * 0.2;
  }
}
