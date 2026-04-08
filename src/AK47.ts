import * as THREE from 'three';
import type { WeaponConfig } from './Weapon';
import { Weapon } from './Weapon';

export const AK47_CONFIG: WeaponConfig = {
  name: 'AK-47',
  fireRate: 0.1,
  damage: 34,  // 3 hits to kill (100 / 34 ≈ 3)
  maxAmmo: 30,
  reloadTime: 0.5  // 500ms
};

export class AK47 extends Weapon {
  public config = AK47_CONFIG;
  
  private readonly BASE_POSITION = new THREE.Vector3(0.22, -0.22, -0.35);
  private readonly BASE_ROTATION = new THREE.Euler(-0.1, 0.1, 0.05);
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super(scene, camera);
    this.currentAmmo = AK47_CONFIG.maxAmmo;
    this.maxAmmo = AK47_CONFIG.maxAmmo;
    this.createModel();
    this.setupControls();
    this.createAmmoDisplay();
    camera.add(this.weaponGroup);
  }
  
  private createAmmoDisplay(): void {
    if (!document.getElementById('ammo-display')) {
      const display = document.createElement('div');
      display.id = 'ammo-display';
      display.innerHTML = `
        <span class="current">${this.currentAmmo}</span>
        <span class="separator">/</span>
        <span class="max">${this.maxAmmo}</span>
      `;
      document.getElementById('weapon-info')?.appendChild(display);
    }
    this.updateAmmoDisplay();
  }
  
  public createModel(): void {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.7, metalness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.2, metalness: 0.9 });

    // Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.4), bodyMat);
    receiver.position.set(0, 0, 0);
    this.weaponGroup.add(receiver);

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 16), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.35);
    this.weaponGroup.add(barrel);

    // Barrel shroud
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 16), bodyMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.01, -0.25);
    this.weaponGroup.add(shroud);

    // Front sight
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.01), metalMat);
    frontSight.position.set(0, 0.035, -0.4);
    this.weaponGroup.add(frontSight);

    // Magazine
    const magMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 });
    this.magazine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.06), magMat);
    this.magazine.position.set(0, -0.09, -0.05);
    this.magazine.rotation.x = 0.2;
    this.weaponGroup.add(this.magazine);

    // Pistol grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), woodMat);
    grip.position.set(0, -0.08, 0.1);
    grip.rotation.x = -0.3;
    this.weaponGroup.add(grip);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.18), woodMat);
    stock.position.set(0, -0.01, 0.28);
    this.weaponGroup.add(stock);

    // Stock butt
    const butt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), woodMat);
    butt.position.set(0, -0.01, 0.37);
    this.weaponGroup.add(butt);

    // Handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.15), woodMat);
    handguard.position.set(0, -0.01, -0.15);
    this.weaponGroup.add(handguard);

    // Rear sight
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), metalMat);
    rearSight.position.set(0, 0.035, 0.05);
    this.weaponGroup.add(rearSight);

    // Dust cover
    const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.01, 0.2), bodyMat);
    dustCover.position.set(0, 0.035, 0);
    this.weaponGroup.add(dustCover);

    // Trigger guard
    const trigger = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 8, 16, Math.PI), metalMat);
    trigger.position.set(0, -0.05, 0.05);
    trigger.rotation.x = Math.PI / 2;
    this.weaponGroup.add(trigger);

    // Charging handle
    const chargingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.015, 0.03), metalMat);
    chargingHandle.position.set(0.02, 0.01, -0.05);
    this.weaponGroup.add(chargingHandle);

    // Muzzle brake
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.05, 8), metalMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.01, -0.48);
    this.weaponGroup.add(muzzle);

    this.weaponGroup.position.copy(this.BASE_POSITION);
    this.weaponGroup.rotation.copy(this.BASE_ROTATION);
  }
  
  public playShotSound(): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.pow(1 - i / bufferSize, 1.5);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;
    
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 100;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    
    noise.connect(filter);
    filter.connect(highpass);
    highpass.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.15);
  }
  
  public playReloadSound(): void {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }
  
  protected updateWeaponPosition(isMoving: boolean): void {
    const walkSpeed = 12;
    const bobX = Math.sin(this.walkTime * walkSpeed) * 0.018 * (isMoving ? 1 : 0.1);
    const bobY = Math.abs(Math.cos(this.walkTime * walkSpeed)) * 0.025 * (isMoving ? 1 : 0.1);
    
    const breathSwayX = Math.sin(this.breathTime) * 0.002;
    const breathSwayY = Math.cos(this.breathTime * 0.7) * 0.0015;
    
    // 换弹时枪上抬效果
    const reloadLiftY = this.reloadLift;
    const reloadLiftRot = -this.reloadLift * 2;  // 上抬时旋转
    
    const targetX = this.BASE_POSITION.x + bobX + breathSwayX;
    const targetY = this.BASE_POSITION.y - bobY - this.recoilAmount * 0.04 + breathSwayY + reloadLiftY;
    const targetZ = this.BASE_POSITION.z + this.recoilAmount * 0.025;
    
    this.weaponGroup.position.x += (targetX - this.weaponGroup.position.x) * 0.2;
    this.weaponGroup.position.y += (targetY - this.weaponGroup.position.y) * 0.2;
    this.weaponGroup.position.z += (targetZ - this.weaponGroup.position.z) * 0.2;
    
    const recoilRotX = this.recoilAmount * 0.25;
    const recoilRotZ = this.recoilAmount * 0.05;
    
    const targetRotX = this.BASE_ROTATION.x + recoilRotX + reloadLiftRot;
    const targetRotY = this.BASE_ROTATION.y + bobX * 0.5;
    const targetRotZ = this.BASE_ROTATION.z + recoilRotZ;
    
    this.weaponGroup.rotation.x += (targetRotX - this.weaponGroup.rotation.x) * 0.2;
    this.weaponGroup.rotation.y += (targetRotY - this.weaponGroup.rotation.y) * 0.2;
    this.weaponGroup.rotation.z += (targetRotZ - this.weaponGroup.rotation.z) * 0.2;
  }
}
