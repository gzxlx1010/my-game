import * as THREE from 'three';

export class AK47 {
  private weaponGroup: THREE.Group;
  private magazine: THREE.Mesh | null = null;
  
  private readonly BASE_POSITION = new THREE.Vector3(0.22, -0.22, -0.35);
  private readonly BASE_ROTATION = new THREE.Euler(-0.1, 0.1, 0.05);
  
  private recoilAmount = 0;
  private time = 0;
  private walkTime = 0;
  private breathTime = 0;
  
  // Auto fire
  private isMouseDown = false;
  private lastShotTime = 0;
  private readonly FIRE_RATE = 0.1; // 100ms between shots (600 RPM)
  
  // Ammo system
  private currentAmmo = 30;
  private readonly MAX_AMMO = 30;
  private isReloading = false;
  private reloadTime = 0;
  private readonly RELOAD_DURATION = 2.0; // 2 seconds to reload
  private magazineOffset = 0; // For reload animation

  // Shared audio context
  private audioCtx: AudioContext | null = null;

  constructor(_scene: THREE.Scene, camera: THREE.Camera) {
    this.weaponGroup = new THREE.Group();
    this.createAK47();
    this.setupControls();
    
    // Attach weapon to camera (proper FPS weapon handling)
    camera.add(this.weaponGroup);
    
    // Create ammo display
    this.createAmmoDisplay();
  }

  private initAudio(): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume if suspended
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private createAmmoDisplay(): void {
    // Create ammo UI if not exists
    if (!document.getElementById('ammo-display')) {
      const ammoDisplay = document.createElement('div');
      ammoDisplay.id = 'ammo-display';
      ammoDisplay.innerHTML = `
        <span class="current">${this.currentAmmo}</span>
        <span class="separator">/</span>
        <span class="max">${this.MAX_AMMO}</span>
      `;
      document.getElementById('weapon-info')?.appendChild(ammoDisplay);
    }
    this.updateAmmoDisplay();
  }

  private updateAmmoDisplay(): void {
    const ammoCount = document.querySelector('#ammo-display .current');
    if (ammoCount) {
      ammoCount.textContent = this.currentAmmo.toString();
    }
  }

  private createAK47(): void {
    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.4,
      metalness: 0.6
    });
    
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.7,
      metalness: 0.1
    });
    
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.2,
      metalness: 0.9
    });

    // Receiver (main body)
    const receiverGeo = new THREE.BoxGeometry(0.08, 0.06, 0.4);
    const receiver = new THREE.Mesh(receiverGeo, bodyMaterial);
    receiver.position.set(0, 0, 0);
    this.weaponGroup.add(receiver);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 16);
    const barrel = new THREE.Mesh(barrelGeo, metalMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.35);
    this.weaponGroup.add(barrel);

    // Barrel shroud
    const shroudGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 16);
    const shroud = new THREE.Mesh(shroudGeo, bodyMaterial);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.01, -0.25);
    this.weaponGroup.add(shroud);

    // Front sight
    const frontSightGeo = new THREE.BoxGeometry(0.01, 0.04, 0.01);
    const frontSight = new THREE.Mesh(frontSightGeo, metalMaterial);
    frontSight.position.set(0, 0.035, -0.4);
    this.weaponGroup.add(frontSight);

    // Magazine (separate mesh for reload animation)
    const magGeo = new THREE.BoxGeometry(0.03, 0.12, 0.06);
    const magMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.4,
      metalness: 0.6
    });
    this.magazine = new THREE.Mesh(magGeo, magMat);
    this.magazine.position.set(0, -0.09, -0.05);
    this.magazine.rotation.x = 0.2;
    this.weaponGroup.add(this.magazine);

    // Pistol grip
    const gripGeo = new THREE.BoxGeometry(0.04, 0.1, 0.05);
    const grip = new THREE.Mesh(gripGeo, woodMaterial);
    grip.position.set(0, -0.08, 0.1);
    grip.rotation.x = -0.3;
    this.weaponGroup.add(grip);

    // Stock (wooden)
    const stockGeo = new THREE.BoxGeometry(0.04, 0.05, 0.18);
    const stock = new THREE.Mesh(stockGeo, woodMaterial);
    stock.position.set(0, -0.01, 0.28);
    this.weaponGroup.add(stock);

    // Stock butt
    const buttGeo = new THREE.BoxGeometry(0.05, 0.06, 0.03);
    const butt = new THREE.Mesh(buttGeo, woodMaterial);
    butt.position.set(0, -0.01, 0.37);
    this.weaponGroup.add(butt);

    // Handguard
    const handguardGeo = new THREE.BoxGeometry(0.04, 0.04, 0.15);
    const handguard = new THREE.Mesh(handguardGeo, woodMaterial);
    handguard.position.set(0, -0.01, -0.15);
    this.weaponGroup.add(handguard);

    // Rear sight
    const rearSightGeo = new THREE.BoxGeometry(0.03, 0.03, 0.02);
    const rearSight = new THREE.Mesh(rearSightGeo, metalMaterial);
    rearSight.position.set(0, 0.035, 0.05);
    this.weaponGroup.add(rearSight);

    // Dust cover
    const dustCoverGeo = new THREE.BoxGeometry(0.07, 0.01, 0.2);
    const dustCover = new THREE.Mesh(dustCoverGeo, bodyMaterial);
    dustCover.position.set(0, 0.035, 0);
    this.weaponGroup.add(dustCover);

    // Trigger guard
    const triggerGeo = new THREE.TorusGeometry(0.02, 0.003, 8, 16, Math.PI);
    const trigger = new THREE.Mesh(triggerGeo, metalMaterial);
    trigger.position.set(0, -0.05, 0.05);
    trigger.rotation.x = Math.PI / 2;
    this.weaponGroup.add(trigger);

    // Charging handle
    const chargingHandleGeo = new THREE.BoxGeometry(0.01, 0.015, 0.03);
    const chargingHandle = new THREE.Mesh(chargingHandleGeo, metalMaterial);
    chargingHandle.position.set(0.02, 0.01, -0.05);
    this.weaponGroup.add(chargingHandle);

    // Muzzle brake
    const muzzleGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.05, 8);
    const muzzle = new THREE.Mesh(muzzleGeo, metalMaterial);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.01, -0.48);
    this.weaponGroup.add(muzzle);

    // Set initial position relative to camera
    this.weaponGroup.position.copy(this.BASE_POSITION);
    this.weaponGroup.rotation.copy(this.BASE_ROTATION);
  }

  private setupControls(): void {
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
    
    // Reload with R key
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        this.initAudio();
        if (!this.isReloading && this.currentAmmo < this.MAX_AMMO) {
          this.startReload();
        }
      }
    });
  }

  private startReload(): void {
    this.isReloading = true;
    this.reloadTime = 0;
    this.magazineOffset = 0;
    this.showReloadIndicator();
  }

  private showReloadIndicator(): void {
    const hud = document.getElementById('hud');
    if (hud && !document.getElementById('reload-indicator')) {
      const reloadIndicator = document.createElement('div');
      reloadIndicator.id = 'reload-indicator';
      reloadIndicator.textContent = 'RELOADING...';
      hud.appendChild(reloadIndicator);
    }
  }

  private hideReloadIndicator(): void {
    const indicator = document.getElementById('reload-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  private completeReload(): void {
    this.currentAmmo = this.MAX_AMMO;
    this.isReloading = false;
    this.magazineOffset = 0;
    this.updateAmmoDisplay();
    this.hideReloadIndicator();
    this.playReloadSound();
  }

  private playReloadSound(): void {
    if (!this.audioCtx) return;
    
    const ctx = this.audioCtx;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  private shoot(): void {
    // Check if can shoot
    if (this.isReloading || this.currentAmmo <= 0) {
      if (this.currentAmmo <= 0 && !this.isReloading) {
        this.startReload();
      }
      return;
    }
    
    // Decrease ammo
    this.currentAmmo--;
    this.updateAmmoDisplay();
    
    // Create muzzle flash
    const flash = document.createElement('div');
    flash.className = 'muzzle-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 100);

    // Apply recoil
    this.recoilAmount = 1.0;
    
    // Play shot sound
    this.playShotSound();
    
    // Auto reload when empty
    if (this.currentAmmo <= 0) {
      this.startReload();
    }
  }
  
  private playShotSound(): void {
    if (!this.audioCtx) return;
    
    const ctx = this.audioCtx;
    
    // Create noise for gunshot
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.pow(1 - i / bufferSize, 1.5);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Low pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;
    
    // High pass to remove rumble
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 100;
    
    // Gain for volume
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

  public update(delta: number, isMoving: boolean, walkTime: number, breathTime: number): void {
    this.time += delta;
    this.walkTime = walkTime;
    this.breathTime = breathTime;
    
    // Handle reload animation
    if (this.isReloading) {
      this.reloadTime += delta;
      
      const reloadProgress = this.reloadTime / this.RELOAD_DURATION;
      if (reloadProgress < 0.4) {
        this.magazineOffset = reloadProgress * 3;
      } else if (reloadProgress < 0.6) {
        this.magazineOffset = 1.2;
      } else if (reloadProgress < 1.0) {
        this.magazineOffset = 1.2 - (reloadProgress - 0.6) * 6;
      }
      
      if (this.reloadTime >= this.RELOAD_DURATION) {
        this.completeReload();
      }
    }
    
    // Auto fire when mouse is held down
    if (this.isMouseDown && !this.isReloading) {
      const currentTime = performance.now() / 1000;
      if (currentTime - this.lastShotTime >= this.FIRE_RATE) {
        this.lastShotTime = currentTime;
        this.shoot();
      }
    }

    // Recoil recovery
    this.recoilAmount *= 0.85;
    
    // Walking bob with synchronized animation
    const walkSpeed = 12;
    const bobX = Math.sin(this.walkTime * walkSpeed) * 0.018 * (isMoving ? 1 : 0.1);
    const bobY = Math.abs(Math.cos(this.walkTime * walkSpeed)) * 0.025 * (isMoving ? 1 : 0.1);
    
    // Breathing sway
    const breathSwayX = Math.sin(this.breathTime) * 0.002;
    const breathSwayY = Math.cos(this.breathTime * 0.7) * 0.0015;
    
    // Calculate weapon position relative to camera
    // Position is now in camera local space (relative to camera)
    const targetX = this.BASE_POSITION.x + bobX + breathSwayX;
    const targetY = this.BASE_POSITION.y - bobY - this.recoilAmount * 0.04 + breathSwayY;
    const targetZ = this.BASE_POSITION.z + this.recoilAmount * 0.025;
    
    // Smooth weapon position (reduces jitter during fast camera movement)
    this.weaponGroup.position.x += (targetX - this.weaponGroup.position.x) * 0.2;
    this.weaponGroup.position.y += (targetY - this.weaponGroup.position.y) * 0.2;
    this.weaponGroup.position.z += (targetZ - this.weaponGroup.position.z) * 0.2;
    
    // Apply rotation
    const recoilRotX = this.recoilAmount * 0.25;
    const recoilRotZ = this.recoilAmount * 0.05;
    
    // Smooth rotation
    const targetRotX = this.BASE_ROTATION.x + recoilRotX;
    const targetRotY = this.BASE_ROTATION.y + bobX * 0.5;
    const targetRotZ = this.BASE_ROTATION.z + recoilRotZ;
    
    this.weaponGroup.rotation.x += (targetRotX - this.weaponGroup.rotation.x) * 0.2;
    this.weaponGroup.rotation.y += (targetRotY - this.weaponGroup.rotation.y) * 0.2;
    this.weaponGroup.rotation.z += (targetRotZ - this.weaponGroup.rotation.z) * 0.2;
    
    // Animate magazine position during reload
    if (this.magazine && this.isReloading) {
      this.magazine.position.y = -0.09 + this.magazineOffset * 0.1;
    }
  }

  public getGroup(): THREE.Group {
    return this.weaponGroup;
  }
  
  public isReloadingNow(): boolean {
    return this.isReloading;
  }
}
