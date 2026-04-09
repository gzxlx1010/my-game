import * as THREE from 'three';
import type { WeaponConfig } from './Weapon';
import { Weapon } from './Weapon';

export const REMINGTON_CONFIG: WeaponConfig = {
  name: 'Remington 870',
  fireRate: 0.8,  // 霰弹枪射速较慢
  damage: 18,     // 每颗弹丸伤害（8颗*18=144，足够击杀）
  maxAmmo: 8,    // 8发
  reloadTime: 0.5,
  pellets: 8     // 8颗弹丸
};

export class Remington extends Weapon {
  public config = REMINGTON_CONFIG;
  
  private readonly BASE_POSITION = new THREE.Vector3(0.25, -0.2, -0.3);
  private readonly BASE_ROTATION = new THREE.Euler(-0.05, 0.08, 0.03);
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super(scene, camera);
    this.currentAmmo = REMINGTON_CONFIG.maxAmmo;
    this.maxAmmo = REMINGTON_CONFIG.maxAmmo;
    this.pellets = REMINGTON_CONFIG.pellets || 8;
    this.createModel();
    camera.add(this.weaponGroup);
  }
  
  public createModel(): void {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.6, metalness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.2, metalness: 0.9 });

    // Pump action body (longer barrel)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.7), bodyMat);
    body.position.set(0, 0, 0);
    this.weaponGroup.add(body);

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.5, 16), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.55);
    this.weaponGroup.add(barrel);

    // Magazine tube (under barrel)
    const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12), metalMat);
    magTube.rotation.x = Math.PI / 2;
    magTube.position.set(0, -0.05, -0.2);
    this.weaponGroup.add(magTube);

    // Pump handle
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.15), woodMat);
    pump.position.set(0, -0.02, -0.15);
    this.weaponGroup.add(pump);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.35), woodMat);
    stock.position.set(0, -0.02, 0.45);
    stock.rotation.x = 0.1;
    this.weaponGroup.add(stock);

    // Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.2), bodyMat);
    receiver.position.set(0, 0.02, 0.25);
    this.weaponGroup.add(receiver);

    // Trigger guard
    const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 8, 16, Math.PI), metalMat);
    triggerGuard.position.set(0, -0.06, 0.2);
    triggerGuard.rotation.x = Math.PI / 2;
    this.weaponGroup.add(triggerGuard);

    // Trigger
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.04, 0.015), metalMat);
    trigger.position.set(0, -0.04, 0.2);
    this.weaponGroup.add(trigger);

    // Front sight
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.01), metalMat);
    frontSight.position.set(0, 0.08, -0.7);
    this.weaponGroup.add(frontSight);

    // Ventilated rib (top rail)
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.35), metalMat);
    rib.position.set(0, 0.07, -0.5);
    this.weaponGroup.add(rib);

    // Ejection port
    const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.08), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
    ejectPort.position.set(0, 0.025, 0.15);
    this.weaponGroup.add(ejectPort);

    this.weaponGroup.position.copy(this.BASE_POSITION);
    this.weaponGroup.rotation.copy(this.BASE_ROTATION);
  }
  
  public playShotSound(): void {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    
    // 霰弹枪声音：短促的"砰"声，带有金属质感
    const bufferSize = Math.floor(ctx.sampleRate * 0.3);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // 初始冲击波
      const shot = Math.exp(-t * 15) * (Math.random() * 2 - 1);
      // 低频轰鸣
      const boom = Math.sin(t * 100 * Math.PI) * Math.exp(-t * 8);
      // 金属回响
      const metal = Math.sin(t * 800 * Math.PI) * Math.exp(-t * 20) * 0.3;
      
      data[i] = shot * 0.5 + boom * 0.4 + metal * 0.1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;
    
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 50;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    
    noise.connect(filter);
    filter.connect(highpass);
    highpass.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.3);
  }
  
  public playReloadSound(): void {
    const ctx = this.getAudioCtx();
    if (!ctx) return;
    
    // 泵动霰弹枪的金属咔哒声
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }
  
  protected updateWeaponPosition(isMoving: boolean): void {
    const walkSpeed = 12;
    const bobX = Math.sin(this.walkTime * walkSpeed) * 0.02 * (isMoving ? 1 : 0.1);
    const bobY = Math.abs(Math.cos(this.walkTime * walkSpeed)) * 0.03 * (isMoving ? 1 : 0.1);
    
    const breathSwayX = Math.sin(this.breathTime) * 0.003;
    const breathSwayY = Math.cos(this.breathTime * 0.7) * 0.002;
    
    // 换弹时枪上抬效果
    const reloadLiftY = this.reloadLift;
    const reloadLiftRot = -this.reloadLift * 2;
    
    const targetX = this.BASE_POSITION.x + bobX + breathSwayX;
    const targetY = this.BASE_POSITION.y - bobY - this.recoilAmount * 0.06 + breathSwayY + reloadLiftY;
    const targetZ = this.BASE_POSITION.z + this.recoilAmount * 0.04;
    
    this.weaponGroup.position.x += (targetX - this.weaponGroup.position.x) * 0.2;
    this.weaponGroup.position.y += (targetY - this.weaponGroup.position.y) * 0.2;
    this.weaponGroup.position.z += (targetZ - this.weaponGroup.position.z) * 0.2;
    
    // 霰弹枪后座更大
    const recoilRotX = this.recoilAmount * 0.4;
    const recoilRotZ = this.recoilAmount * 0.08;
    
    const targetRotX = this.BASE_ROTATION.x + recoilRotX + reloadLiftRot;
    const targetRotY = this.BASE_ROTATION.y + bobX * 0.5;
    const targetRotZ = this.BASE_ROTATION.z + recoilRotZ;
    
    this.weaponGroup.rotation.x += (targetRotX - this.weaponGroup.rotation.x) * 0.2;
    this.weaponGroup.rotation.y += (targetRotY - this.weaponGroup.rotation.y) * 0.2;
    this.weaponGroup.rotation.z += (targetRotZ - this.weaponGroup.rotation.z) * 0.2;
  }
}
