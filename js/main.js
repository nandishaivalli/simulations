// js/main.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import { Planet } from './planet.js';
import { StarField } from './starField.js';
import { initRecording, startRecording, stopRecording } from './utils.js';

// —————————————————————————————————————————————
//  SCALE & SPEED SETTINGS
// —————————————————————————————————————————————
const KM_TO_UNIT = 1e-6;  // 1 unit = 1 000 000 km
const RADIUS_SCALE = 80;    // boost radii for visibility
const SPEED_SCALE = 0.2;   // slow motions to 20%

class SolarSystem {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, precision: 'highp' });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.gui = new GUI();
    this.planets = [];
    this.currentCenter = null;
    this.prevCenterPos = new THREE.Vector3();
    this.starField = null;
    this.sunLight = null;
    this.sunLight2 = null;
    this.sunDirLight = null;

    this.init();
    this.setupGUI();
    this.animate();
  }

  init() {
    // Renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // Recording setup
    initRecording(this.renderer.domElement);

    // Camera
    this.camera.position.set(0, 0, 6000);

    // Controls
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 15000;
    this.controls.zoomSpeed = 1.5;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    // Lights & background
    this.scene.add(new THREE.AmbientLight(0x404040, 1.0));
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x080820, 0.3));
    this.starField = new StarField(this.scene);
    this.sunDirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.scene.add(this.sunDirLight, this.sunDirLight.target);

    // Build bodies
    this.createPlanets();

    // Double-click to focus
    this.renderer.domElement.addEventListener('dblclick', ev => {
      const mouse = new THREE.Vector2(
        (ev.clientX / window.innerWidth) * 2 - 1,
        -(ev.clientY / window.innerHeight) * 2 + 1
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, this.camera);
      const hit = ray.intersectObjects(this.planets.map(p => p.mesh))[0];
      if (hit) {
        const target = this.planets.find(p => p.mesh === hit.object);
        this.centerOnPlanet(target);
      }
    });
  }

  setupGUI() {
    const vis = this.gui.addFolder('Planet Visibility');
    const view = this.gui.addFolder('View Controls');
    const center = this.gui.addFolder('Center on Planet');
    const rec = this.gui.addFolder('Recording');

    // Visibility toggles
    this.planets.forEach(p => {
      if (p.name !== 'Sun') vis.add(p, 'visible').name(p.name);
    });
    vis.open();

    // View controls
    view.add(this, 'resetView').name('Reset View');
    view.add(this, 'zoomToSun').name('Focus on Sun');
    view.open();

    // Fly-to controls
    this.planets.forEach(p => {
      if (p.name !== 'Sun') {
        center.add({ Go: () => this.centerOnPlanet(p) }, 'Go').name(p.name);
      }
    });
    center.open();

    // Recording
    rec.add({ Start: () => startRecording() }, 'Start');
    rec.add({ Stop: () => stopRecording() }, 'Stop');
    rec.open();
  }

  resetView() {
    this.camera.position.set(0, 0, 6000);
    this.controls.target.set(0, 0, 0);
    this.currentCenter = null;
    this.controls.update();
  }

  zoomToSun() {
    const sun = this.planets.find(p => p.name === 'Sun');
    if (sun) this.centerOnPlanet(sun);
  }

  centerOnPlanet(planet) {
    if (!planet) return;
    const worldPos = new THREE.Vector3();
    planet.mesh.getWorldPosition(worldPos);
    this.controls.target.copy(worldPos);

    let dir;
    if (planet.name === 'Sun') {
      dir = new THREE.Vector3(0, 0, 1);
    } else {
      const sunPos = new THREE.Vector3();
      this.planets.find(p => p.name === 'Sun').mesh.getWorldPosition(sunPos);
      dir = worldPos.clone().sub(sunPos).normalize();
    }

    const flyDist = planet.radius * 5 + 10;
    this.camera.position.copy(worldPos.clone().add(dir.multiplyScalar(flyDist)));

    this.prevCenterPos.copy(worldPos);
    this.currentCenter = planet;
    this.controls.update();
  }

  createPlanets() {
    const planetData = [
      // name, radius, texture, distance, rotationSpeed, orbitSpeed, axialTilt, [moons]
      { name: 'Sun', radius: 696340 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_sun.jpg', emissive: true, rotationSpeed: 0, orbitSpeed: 0, axialTilt: 7.25, moons: [] },
      { name: 'Mercury', radius: 2439.7 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_mercury.jpg', distance: 57900000 * KM_TO_UNIT, rotationSpeed: 0.004 * SPEED_SCALE, orbitSpeed: 0.04 * SPEED_SCALE, axialTilt: 0.01, moons: [] },
      { name: 'Venus', radius: 6051.8 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_venus_surface.jpg', distance: 108200000 * KM_TO_UNIT, rotationSpeed: 0.002 * SPEED_SCALE, orbitSpeed: 0.015 * SPEED_SCALE, axialTilt: 177.4, moons: [] },
      {
        name: 'Earth', radius: 6371 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_earth_daymap.jpg', distance: 149600000 * KM_TO_UNIT, rotationSpeed: 0.01 * SPEED_SCALE, orbitSpeed: 0.01 * SPEED_SCALE, axialTilt: 23.44,
        moons: [
          {
            name: 'Moon', radius: 1737.1 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_moon.jpg',
            distance: 394400 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.005 * SPEED_SCALE,
            orbitSpeed: 0.05 * SPEED_SCALE
          }
        ]
      },
      {
        name: 'Mars', radius: 3389.5 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_mars.jpg', distance: 227900000 * KM_TO_UNIT, rotationSpeed: 0.008 * SPEED_SCALE, orbitSpeed: 0.008 * SPEED_SCALE, axialTilt: 25.19,
        moons: [
          {
            name: 'Phobos', radius: 11.267 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_phobos.jpg',
            distance: 9376 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.01 * SPEED_SCALE,
            orbitSpeed: 0.1 * SPEED_SCALE
          },
          {
            name: 'Deimos', radius: 6.2 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_deimos.jpg',
            distance: 23460 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.008 * SPEED_SCALE,
            orbitSpeed: 0.08 * SPEED_SCALE
          }
        ]
      },
      { name: 'Ceres', radius: 473 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_ceres.jpg', distance: 413700000 * KM_TO_UNIT, rotationSpeed: 0.005 * SPEED_SCALE, orbitSpeed: 0.002 * SPEED_SCALE, axialTilt: 3.0, moons: [] },
      {
        name: 'Jupiter', radius: 69911 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_jupiter.jpg', distance: 778500000 * KM_TO_UNIT, rotationSpeed: 0.02 * SPEED_SCALE, orbitSpeed: 0.002 * SPEED_SCALE, axialTilt: 3.13,
        moons: [
          {
            name: 'Io', radius: 1821.6 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_io.jpg',
            distance: 421700 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.01 * SPEED_SCALE,
            orbitSpeed: 0.1 * SPEED_SCALE
          },
          {
            name: 'Europa', radius: 1560.8 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_europa.jpg',
            distance: 671100 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.008 * SPEED_SCALE,
            orbitSpeed: 0.08 * SPEED_SCALE
          },
          {
            name: 'Ganymede', radius: 2634.1 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_ganymede.jpg',
            distance: 1070400 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.006 * SPEED_SCALE,
            orbitSpeed: 0.06 * SPEED_SCALE
          },
          {
            name: 'Callisto', radius: 2410.3 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_callisto.jpg',
            distance: 1882700 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.004 * SPEED_SCALE,
            orbitSpeed: 0.04 * SPEED_SCALE
          }
        ]
      },
      {
        name: 'Saturn', radius: 58232 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_saturn.jpg', distance: 1433500000 * KM_TO_UNIT, rotationSpeed: 0.018 * SPEED_SCALE, orbitSpeed: 0.0015 * SPEED_SCALE, axialTilt: 26.73,
        hasBelt: true,
        beltData: { innerRadius: 300000000 * KM_TO_UNIT, outerRadius: 478000000 * KM_TO_UNIT, texture: 'textures/8k_saturn_ring_alpha.png' },
        moons: [
          {
            name: 'Titan', radius: 25740.7 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/4k_titan.jpg',
            distance: 1221870 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.005 * SPEED_SCALE,
            orbitSpeed: 0.05 * SPEED_SCALE
          },
          {
            name: 'Enceladus', radius: 252.1 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_enceladus.jpg',
            distance: 237948 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.007 * SPEED_SCALE,
            orbitSpeed: 0.07 * SPEED_SCALE
          }
        ]
      },
      {
        name: 'Uranus', radius: 25362 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_uranus.png', distance: 2872500000 * KM_TO_UNIT, rotationSpeed: 0.012 * SPEED_SCALE, orbitSpeed: 0.001 * SPEED_SCALE, axialTilt: 97.77,
        hasBelt: true,
        beltData: { innerRadius: 50000000 * KM_TO_UNIT, outerRadius: 70000000 * KM_TO_UNIT, texture: 'textures/8k_uranus_ring_alpha.png' },
        moons: []
      },
      {
        name: 'Neptune', radius: 24622 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_neptune.png', distance: 4495100000 * KM_TO_UNIT, rotationSpeed: 0.014 * SPEED_SCALE, orbitSpeed: 0.0008 * SPEED_SCALE, axialTilt: 28.32,
        moons: [
          {
            name: 'Triton', radius: 1353.4 * KM_TO_UNIT * RADIUS_SCALE, texture: 'textures/8k_treton.png',
            distance: 354800 * KM_TO_UNIT * RADIUS_SCALE,
            rotationSpeed: 0.006 * SPEED_SCALE,
            orbitSpeed: 0.06 * SPEED_SCALE
          }
        ]
      },
    ];

    planetData.forEach(data => {
      const pl = new Planet({
        name: data.name,
        radius: data.radius,
        texture: data.texture,
        distance: data.distance,
        rotationSpeed: data.rotationSpeed,
        orbitSpeed: data.orbitSpeed,
        emissive: data.emissive,
        hasBelt: data.hasBelt,
        beltData: data.beltData,
        moons: data.moons,
        axialTilt: data.axialTilt
      });

      this.planets.push(pl);
      this.scene.add(pl.mesh);
      if (pl.orbit) this.scene.add(pl.orbit);
      if (pl.belt) this.scene.add(pl.belt);

      // Attach moons (they now have scaled distances)
      (data.moons || []).forEach((m, i) => {
        const mMesh = pl.moonMeshes[i];
        pl.mesh.add(mMesh);
        mMesh.position.set(m.distance, 0, 0);
      });

      // Sun lights
      if (data.name === 'Sun') {
        this.sunLight = new THREE.PointLight(0xffffff, 5, 0);
        this.sunLight2 = new THREE.PointLight(0xffffff, 2.5, 0);
        this.scene.add(this.sunLight, this.sunLight2);
        this.sunDirLight.position.copy(pl.mesh.position);
        this.sunDirLight.target.position.set(0, 0, 0);
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.planets.forEach(p => p.update());

    // Sync Sun lights
    const sunPos = new THREE.Vector3();
    this.planets.find(p => p.name === 'Sun').mesh.getWorldPosition(sunPos);
    this.sunLight.position.copy(sunPos);
    this.sunLight2.position.copy(sunPos);
    this.sunDirLight.position.copy(sunPos);

    // Follow focused planet
    if (this.currentCenter) {
      const newPos = new THREE.Vector3();
      this.currentCenter.mesh.getWorldPosition(newPos);
      const delta = newPos.clone().sub(this.prevCenterPos);
      this.camera.position.add(delta);
      this.controls.target.add(delta);
      this.prevCenterPos.copy(newPos);
    }

    this.controls.update();
    this.starField.update();
    this.renderer.render(this.scene, this.camera);
  }
}

const solarSystem = new SolarSystem();

window.addEventListener('resize', () => {
  solarSystem.camera.aspect = window.innerWidth / window.innerHeight;
  solarSystem.camera.updateProjectionMatrix();
  solarSystem.renderer.setSize(window.innerWidth, window.innerHeight);
});
