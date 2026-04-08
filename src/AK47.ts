import * as THREE from 'three';

export class AK47 {
  private weaponGroup: THREE.Group;
  private magazine: THREE.Mesh | null = null;
  
  private readonly BASE_POSITION = new THREE.Vector3(18, -16, -28);
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

  constructor(scene: THREE.Scene, _camera: THREE.Camera) {
    this.weaponGroup = new THREE.Group();
    this.createAK47();
    this.setupControls();
    
    // Add to scene, not camera (for proper rendering)
    scene.add(this.weaponGroup);
    
    // Create ammo display
    this.createAmmoDisplay();
  }

  private createAmmoDisplay(): void {
    // Create ammo UI if not exists
    if (!document.getElementById('ammo-display')) {
      const ammoDisplay = document.createElement('div');
      ammoDisplay.id = 'ammo-display';
      ammoDisplay.innerHTML = `
        <span id="ammo-count">${this.currentAmmo}</span> / <span id="ammo-max">${this.MAX_AMMO}</span>
      `;
      document.getElementById('hud')?.appendChild(ammoDisplay);
    }
    this.updateAmmoDisplay();
  }

  private updateAmmoDisplay(): void {
    const ammoCount = document.getElementById('ammo-count');
    const ammoMax = document.getElementById('ammo-max');
    if (ammoCount) {
      ammoCount.textContent = this.currentAmmo.toString();
    }
    if (ammoMax) {
      ammoMax.textContent = this.MAX_AMMO.toString();
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
    const receiverGeo = new THREE.BoxGeometry(8, 6, 40);
    const receiver = new THREE.Mesh(receiverGeo, bodyMaterial);
    receiver.position.set(0, 0, 0);
    this.weaponGroup.add(receiver);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(1.5, 1.5, 35, 16);
    const barrel = new THREE.Mesh(barrelGeo, metalMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 1, -35);
    this.weaponGroup.add(barrel);

    // Barrel shroud
    const shroudGeo = new THREE.CylinderGeometry(2.5, 2.5, 25, 16);
    const shroud = new THREE.Mesh(shroudGeo, bodyMaterial);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 1, -25);
    this.weaponGroup.add(shroud);

    // Front sight
    const frontSightGeo = new THREE.BoxGeometry(1, 4, 1);
    const frontSight = new THREE.Mesh(frontSightGeo, metalMaterial);
    frontSight.position.set(0, 3.5, -40);
    this.weaponGroup.add(frontSight);

    // Magazine (separate mesh for reload animation)
    const magGeo = new THREE.BoxGeometry(3, 12, 6);
    const magMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.4,
      metalness: 0.6
    });
    this.magazine = new THREE.Mesh(magGeo, magMat);
    this.magazine.position.set(0, -9, -5);
    this.magazine.rotation.x = 0.2;
    this.weaponGroup.add(this.magazine);

    // Pistol grip
    const gripGeo = new THREE.BoxGeometry(4, 10, 5);
    const grip = new THREE.Mesh(gripGeo, woodMaterial);
    grip.position.set(0, -8, 10);
    grip.rotation.x = -0.3;
    this.weaponGroup.add(grip);

    // Stock (wooden)
    const stockGeo = new THREE.BoxGeometry(4, 5, 18);
    const stock = new THREE.Mesh(stockGeo, woodMaterial);
    stock.position.set(0, -1, 28);
    this.weaponGroup.add(stock);

    // Stock butt
    const buttGeo = new THREE.BoxGeometry(5, 6, 3);
    const butt = new THREE.Mesh(buttGeo, woodMaterial);
    butt.position.set(0, -1, 37);
    this.weaponGroup.add(butt);

    // Handguard
    const handguardGeo = new THREE.BoxGeometry(4, 4, 15);
    const handguard = new THREE.Mesh(handguardGeo, woodMaterial);
    handguard.position.set(0, -1, -15);
    this.weaponGroup.add(handguard);

    // Rear sight
    const rearSightGeo = new THREE.BoxGeometry(3, 3, 2);
    const rearSight = new THREE.Mesh(rearSightGeo, metalMaterial);
    rearSight.position.set(0, 3.5, 5);
    this.weaponGroup.add(rearSight);

    // Dust cover
    const dustCoverGeo = new THREE.BoxGeometry(7, 1, 20);
    const dustCover = new THREE.Mesh(dustCoverGeo, bodyMaterial);
    dustCover.position.set(0, 3.5, 0);
    this.weaponGroup.add(dustCover);

    // Trigger guard
    const triggerGeo = new THREE.TorusGeometry(2, 0.3, 8, 16, Math.PI);
    const trigger = new THREE.Mesh(triggerGeo, metalMaterial);
    trigger.position.set(0, -5, 5);
    trigger.rotation.x = Math.PI / 2;
    this.weaponGroup.add(trigger);

    // Charging handle
    const chargingHandleGeo = new THREE.BoxGeometry(1, 1.5, 3);
    const chargingHandle = new THREE.Mesh(chargingHandleGeo, metalMaterial);
    chargingHandle.position.set(2, 1, -5);
    this.weaponGroup.add(chargingHandle);

    // Muzzle brake
    const muzzleGeo = new THREE.CylinderGeometry(2, 2.5, 5, 8);
    const muzzle = new THREE.Mesh(muzzleGeo, metalMaterial);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 1, -48);
    this.weaponGroup.add(muzzle);

    // Set initial position
    this.weaponGroup.position.copy(this.BASE_POSITION);
    this.weaponGroup.rotation.copy(this.BASE_ROTATION);
    
    // Scale appropriately for FPS view
    this.weaponGroup.scale.set(0.5, 0.5, 0.5);
  }

  private setupControls(): void {
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
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
      if (e.code === 'KeyR' && !this.isReloading && this.currentAmmo < this.MAX_AMMO) {
        this.startReload();
      }
    });
  }

  private startReload(): void {
    this.isReloading = true;
    this.reloadTime = 0;
    this.magazineOffset = 0;
    
    // Show reload indicator
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
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch {
      // Audio not supported
    }
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
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Create noise for gunshot
      const bufferSize = audioCtx.sampleRate * 0.1;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      // Low pass filter for muffled sound
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;
      
      // Gain for volume
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      
      noise.start(audioCtx.currentTime);
      noise.stop(audioCtx.currentTime + 0.1);
    } catch {
      // Audio not supported
    }
  }

  public update(delta: number, isMoving: boolean, walkTime: number, breathTime: number, camera: THREE.Camera): void {
    this.time += delta;
    this.walkTime = walkTime;
    this.breathTime = breathTime;
    
    // Handle reload animation
    if (this.isReloading) {
      this.reloadTime += delta;
      
      // Animate magazine dropping and coming back
      const reloadProgress = this.reloadTime / this.RELOAD_DURATION;
      if (reloadProgress < 0.4) {
        // Magazine drops down
        this.magazineOffset = reloadProgress * 3;
      } else if (reloadProgress < 0.6) {
        // Magazine at bottom
        this.magazineOffset = 1.2;
      } else if (reloadProgress < 1.0) {
        // Magazine comes back up
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
    const bobX = Math.sin(this.walkTime * walkSpeed) * 1.8 * (isMoving ? 1 : 0.1);
    const bobY = Math.abs(Math.cos(this.walkTime * walkSpeed)) * 2.5 * (isMoving ? 1 : 0.1);
    
    // Breathing sway
    const breathSwayX = Math.sin(this.breathTime) * 0.02;
    const breathSwayY = Math.cos(this.breathTime * 0.7) * 0.015;
    
    // Calculate weapon position relative to camera
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    
    camera.getWorldDirection(forward);
    right.crossVectors(forward, up);
    
    // Weapon offset from camera
    const weaponOffset = new THREE.Vector3(
      this.BASE_POSITION.x + bobX + breathSwayX + right.x * 2,
      this.BASE_POSITION.y - bobY - this.recoilAmount * 4 + breathSwayY,
      this.BASE_POSITION.z + this.recoilAmount * 2.5
    );
    
    // Set weapon position in world space
    this.weaponGroup.position.copy(camera.position);
    this.weaponGroup.position.add(forward.multiplyScalar(-weaponOffset.z));
    this.weaponGroup.position.add(right.multiplyScalar(weaponOffset.x));
    this.weaponGroup.position.y += weaponOffset.y;
    
    // Apply rotation to match camera
    this.weaponGroup.quaternion.copy(camera.quaternion);
    
    // Add recoil rotation
    const recoilRotX = this.recoilAmount * 0.25;
    const recoilRotZ = this.recoilAmount * 0.05;
    
    this.weaponGroup.rotateX(this.BASE_ROTATION.x + recoilRotX);
    this.weaponGroup.rotateY(this.BASE_ROTATION.y + bobX * 0.01);
    this.weaponGroup.rotateZ(this.BASE_ROTATION.z + recoilRotZ);
    
    // Animate magazine position during reload
    if (this.magazine && this.isReloading) {
      this.magazine.position.y = -9 + this.magazineOffset;
    }
  }

  public getGroup(): THREE.Group {
    return this.weaponGroup;
  }
  
  public isReloadingNow(): boolean {
    return this.isReloading;
  }
}
