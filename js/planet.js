// js/planet.js

import * as THREE from 'three';

export class Planet {
  constructor(data) {
    this.name = data.name;
    this.radius = data.radius;
    this.texture = data.texture;
    this.position = data.position || new THREE.Vector3(0, 0, 0);
    this.rotationSpeed = data.rotationSpeed || 0;
    this.orbitSpeed = data.orbitSpeed || 0;
    this.distance = data.distance || 0;
    this.visible = true;
    this.emissive = data.emissive || false;
    this.moons = data.moons || [];
    this.hasBelt = data.hasBelt || false;
    this.beltData = data.beltData || null;
    this.tiltRad = (data.axialTilt || 0) * Math.PI / 180;

    // Planet mesh + axis
    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.z = this.tiltRad;
    this.axis = this.createAxis();
    this.mesh.add(this.axis);

    // Static planet orbit & rings
    this.orbit = this.createOrbit();
    this.belt = this.hasBelt ? this.createBelt() : null;

    // Moons
    this.moonMeshes = this.createMoons();
    this.moonMeshes.forEach((moon, i) => {
      const m = this.moons[i];
      moon.position.set(m.distance, 0, 0);
      this.mesh.add(moon);
    });

    // Static full-orbit rings for each moon
    this.moonFullOrbits = this.moons.map(m => {
      const segs = 64;
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const θ = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          Math.cos(θ) * m.distance,
          0,
          Math.sin(θ) * m.distance
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.1,
        linewidth: 10
      });
      const line = new THREE.LineLoop(geo, mat);
      this.mesh.add(line);
      return line;
    });

    // Dynamic trailing tail for each moon (shorter, denser, brighter)
    this.moonOrbitTails = this.moons.map(m => {
      const geom = new THREE.BufferGeometry();
      const mat = new THREE.LineBasicMaterial({
        color: 0xffee33,            // extra-bright yellow
        transparent: true,
        opacity: 1.0,                 // full
        linewidth: 30,                   // thicker
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false
      });
      const line = new THREE.Line(geom, mat);
      line.renderOrder = 1;
      this.mesh.add(line);
      return { line, distance: m.distance, speed: m.orbitSpeed };
    });
  }

  createMesh() {
    const geo = new THREE.SphereGeometry(this.radius, 64, 64);
    const loader = new THREE.TextureLoader();
    const opts = {
      map: loader.load(this.texture),
      shininess: 5,
      reflectivity: 0.2,
      transparent: false,
      depthWrite: true
    };
    if (this.name === 'Sun' || this.emissive) {
      opts.emissive = new THREE.Color(0xffffff);
      opts.emissiveMap = loader.load(this.texture);
      opts.emissiveIntensity = 1;
      opts.blending = THREE.NormalBlending;
    }
    return new THREE.Mesh(geo, new THREE.MeshPhongMaterial(opts));
  }

  createAxis() {
    const len = this.radius * 1.5;
    const pts = [
      new THREE.Vector3(0, -len, 0),
      new THREE.Vector3(0, +len, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.75
    });
    return new THREE.Line(geo, mat);
  }

  createOrbit() {
    if (!this.distance) return null;
    const segs = 256, pts = [];
    for (let i = 0; i <= segs; i++) {
      const θ = (i / segs) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(θ) * this.distance,
        0,
        Math.sin(θ) * this.distance
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5
    });
    return new THREE.LineLoop(geo, mat);
  }

  createBelt() {
    if (!this.hasBelt) return null;
    const { innerRadius, outerRadius, texture } = this.beltData;
    const geo = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const mat = new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load(texture),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const belt = new THREE.Mesh(geo, mat);
    belt.rotation.x = Math.PI / 2;
    return belt;
  }

  createMoons() {
    return this.moons.map(m => {
      const geo = new THREE.SphereGeometry(m.radius, 32, 32);
      const mat = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load(m.texture),
        shininess: 5,
        transparent: false,
        depthWrite: true
      });
      const moon = new THREE.Mesh(geo, mat);
      moon.userData = {
        orbitSpeed: m.orbitSpeed,
        distance: m.distance,
        rotationSpeed: m.rotationSpeed
      };
      return moon;
    });
  }

  update() {
    // Visibility
    this.mesh.visible = this.visible;
    this.axis.visible = this.visible;
    if (this.orbit) this.orbit.visible = this.visible;
    if (this.belt) this.belt.visible = this.visible;
    this.moonFullOrbits.forEach(o => o.visible = this.visible);
    this.moonOrbitTails.forEach(t => t.line.visible = this.visible);

    // Planet self-rotation & solar orbit
    this.mesh.rotation.y += this.rotationSpeed;
    if (this.distance) {
      this.angle = (this.angle || 0) + this.orbitSpeed;
      this.mesh.position.x = Math.cos(this.angle) * this.distance;
      this.mesh.position.z = Math.sin(this.angle) * this.distance;
    }

    // Update moons & tails
    const t = Date.now() * 0.001;
    const segs = 64;
    const tailAngle = Math.PI * 0.083;         // ~15°

    this.moonMeshes.forEach((moon, i) => {
      const { orbitSpeed, distance, rotationSpeed } = moon.userData;
      const θ0 = t * orbitSpeed;

      // Move moon
      moon.position.set(
        Math.cos(θ0) * distance,
        0,
        Math.sin(θ0) * distance
      );
      moon.rotation.y += rotationSpeed;

      // Rebuild dense, short trailing tail
      const { line } = this.moonOrbitTails[i];
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const θ = θ0 + (tailAngle * j / segs);
        pts.push(new THREE.Vector3(
          Math.cos(θ) * distance,
          0,
          Math.sin(θ) * distance
        ));
      }
      line.geometry.setFromPoints(pts);
    });
  }
}
