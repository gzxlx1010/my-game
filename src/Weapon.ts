import * as THREE from 'three';

export interface WeaponConfig {
  name: string;
  fireRate: number;        // 射击间隔（秒）
  damage: number;          // 伤害值
  maxAmmo: number;        // 最大弹药
  reloadTime: number;      // 换弹时间（秒）
  soundUrl?: string;       // 音效URL（预留）
}

export abstract class Weapon {
  protected scene: THREE.Scene;
  protected camera: THREE.Camera;
  protected weaponGroup: THREE.Group;
  protected magazine: THREE.Mesh | null = null;
  
  protected currentAmmo: number;
  protected maxAmmo: number;
  protected isReloading = false;
  protected reloadTime = 0;
  protected magazineOffset = 0;
  protected reloadLift = 0;  // 换弹时枪上抬的角度
  protected isMouseDown = false;
  protected lastShotTime = 0;
  
  protected recoilAmount = 0;
  protected time = 0;
  protected walkTime = 0;
  protected breathTime = 0;
  
  protected audioCtx: AudioContext | null = null;
  
  public abstract config: WeaponConfig;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.weaponGroup = new THREE.Group();
    this.currentAmmo = 30;  // Default, will be set by subclass
    this.maxAmmo = 30;
  }
  
  public abstract createModel(): void;
  
  public initAudio(): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }
  
  public abstract playShotSound(): void;
  public abstract playReloadSound(): void;
  
  public setupControls(): void {
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.initAudio();
        this.isMouseDown = true;
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });
    
    document.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        this.initAudio();
        if (!this.isReloading && this.currentAmmo < this.maxAmmo) {
          this.startReload();
        }
      }
    });
  }
  
  protected shoot(): boolean {
    if (this.isReloading || this.currentAmmo <= 0) {
      if (this.currentAmmo <= 0 && !this.isReloading) {
        this.startReload();
      }
      return false;
    }
    
    this.currentAmmo--;
    this.updateAmmoDisplay();
    this.createMuzzleFlash();
    this.recoilAmount = 1.0;
    this.playShotSound();
    
    if (this.currentAmmo <= 0) {
      this.startReload();
    }
    
    return true;
  }
  
  protected createMuzzleFlash(): void {
    const flash = document.createElement('div');
    flash.className = 'muzzle-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 100);
  }
  
  protected startReload(): void {
    this.isReloading = true;
    this.reloadTime = 0;
    this.magazineOffset = 0;
    this.reloadLift = 0;
    this.showReloadIndicator();
  }
  
  protected showReloadIndicator(): void {
    const hud = document.getElementById('hud');
    if (hud && !document.getElementById('reload-indicator')) {
      const indicator = document.createElement('div');
      indicator.id = 'reload-indicator';
      indicator.textContent = 'RELOADING...';
      hud.appendChild(indicator);
    }
  }
  
  protected hideReloadIndicator(): void {
    const indicator = document.getElementById('reload-indicator');
    if (indicator) indicator.remove();
  }
  
  protected completeReload(): void {
    this.currentAmmo = this.maxAmmo;
    this.isReloading = false;
    this.magazineOffset = 0;
    this.updateAmmoDisplay();
    this.hideReloadIndicator();
    this.playReloadSound();
  }
  
  protected updateAmmoDisplay(): void {
    const ammoDisplay = document.getElementById('ammo-display');
    const ammoCount = document.querySelector('#ammo-display .current');
    if (ammoCount) {
      ammoCount.textContent = this.currentAmmo.toString();
    }
    if (ammoDisplay) {
      ammoDisplay.classList.remove('low', 'empty');
      if (this.currentAmmo === 0) {
        ammoDisplay.classList.add('empty');
      } else if (this.currentAmmo <= 10) {
        ammoDisplay.classList.add('low');
      }
    }
  }
  
  public update(delta: number, isMoving: boolean, walkTime: number, breathTime: number): boolean {
    this.time += delta;
    this.walkTime = walkTime;
    this.breathTime = breathTime;
    
    let didShoot = false;
    
    // Reload animation
    if (this.isReloading) {
      this.reloadTime += delta;
      const progress = this.reloadTime / this.config.reloadTime;
      
      // 换弹动画：枪往上抬，停留，然后恢复
      // 0% - 20%: 枪快速上抬
      // 20% - 70%: 保持在上抬位置
      // 70% - 100%: 平滑恢复到原位（带缓冲）
      if (progress < 0.2) {
        // 快速上抬，使用 ease-out
        const t = progress / 0.2;
        this.reloadLift = this.easeOutQuad(t) * 0.15;
      } else if (progress < 0.7) {
        // 保持在上抬位置
        this.reloadLift = 0.15;
      } else {
        // 平滑恢复，使用 ease-in-out
        const t = (progress - 0.7) / 0.3;
        this.reloadLift = 0.15 * this.easeInOutQuad(1 - t);
      }
      
      if (this.reloadTime >= this.config.reloadTime) {
        this.completeReload();
      }
    } else {
      // 非换弹状态时平滑恢复
      this.reloadLift *= 0.85;
    }
    
    // Auto fire
    if (this.isMouseDown && !this.isReloading) {
      const currentTime = performance.now() / 1000;
      if (currentTime - this.lastShotTime >= this.config.fireRate) {
        this.lastShotTime = currentTime;
        this.shoot();
        didShoot = true;
      }
    }
    
    // Recoil decay - faster recovery (within 1 second)
    // Using exponential decay with rate that ensures near-zero after ~0.7s
    this.recoilAmount *= Math.pow(0.05, delta * 3);
    this.updateWeaponPosition(isMoving);
    
    if (this.magazine && this.isReloading) {
      this.magazine.position.y = -0.09 + this.magazineOffset * 0.1;
    }
    
    return didShoot;
  }
  
  protected abstract updateWeaponPosition(isMoving: boolean): void;
  
  public getWeaponGroup(): THREE.Group {
    return this.weaponGroup;
  }
  
  public isReloadingNow(): boolean {
    return this.isReloading;
  }
  
  public getCurrentAmmo(): number {
    return this.currentAmmo;
  }
  
  public getMaxAmmo(): number {
    return this.maxAmmo;
  }
  
  public canShoot(): boolean {
    return this.isMouseDown && !this.isReloading && this.currentAmmo > 0;
  }
  
  public getDamage(): number {
    return this.config.damage;
  }
  
  public getWeaponName(): string {
    return this.config.name;
  }
  
  // 缓动函数
  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }
  
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}
