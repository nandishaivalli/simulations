import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://unpkg.com/dat.gui@0.7.9/build/dat.gui.module.js';
import RecordRTC from 'https://unpkg.com/recordrtc@5.6.2/RecordRTC.min.js';
import { Planet } from './planet.js';
import { StarField } from './starField.js';

class SolarSystem {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            logarithmicDepthBuffer: true,
            precision: 'highp'
        });
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.planets = [];
        this.starField = null;
        this.recorder = null;
        this.currentCenter = null;
        this.sunLight = null;
        this.sunLight2 = null;
        this.isRecording = false;
        this.recordingStatus = document.getElementById('recordingStatus');
        this.gui = new GUI();
        
        this.init();
        this.setupGUI();
        this.setupRecording();
        this.animate();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.z = 100;

        // Setup controls
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 1000;
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 1.5;
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Create star field
        this.starField = new StarField(this.scene);

        // Create planets
        this.createPlanets();

        // Add keyboard controls for zoom
        this.setupKeyboardControls();
    }

    setupKeyboardControls() {
        window.addEventListener('keydown', (event) => {
            switch(event.key) {
                case '+':
                case '=':
                    this.zoomIn();
                    break;
                case '-':
                case '_':
                    this.zoomOut();
                    break;
                case '0':
                    this.resetView();
                    break;
                case '1':
                    this.zoomToSun();
                    break;
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    const planetIndex = parseInt(event.key) - 2;
                    if (planetIndex >= 0 && planetIndex < this.planets.length - 1) {
                        this.centerOnPlanet(this.planets[planetIndex + 1]); // +1 to skip the Sun
                    }
                    break;
            }
        });

        // Add double-click to zoom to planet
        this.renderer.domElement.addEventListener('dblclick', (event) => {
            const mouse = new THREE.Vector2(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            const intersects = raycaster.intersectObjects(this.planets.map(p => p.mesh));
            if (intersects.length > 0) {
                const planet = this.planets.find(p => p.mesh === intersects[0].object);
                this.centerOnPlanet(planet);
            }
        });
    }

    centerOnPlanet(planet) {
        if (!planet) return;

        this.currentCenter = planet;
        
        // Calculate the new camera position
        const distance = 50; // Fixed distance from the planet
        const targetPosition = planet.mesh.position.clone();
        
        // Animate camera movement
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const startTime = performance.now();
        const duration = 1000; // 1 second

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease in-out function
            const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : -1 + (4 - 2 * progress) * progress;

            // Move camera to new position
            const newPosition = targetPosition.clone().add(new THREE.Vector3(0, 0, distance));
            this.camera.position.lerpVectors(startPosition, newPosition, easeProgress);
            
            // Update controls target
            this.controls.target.lerpVectors(startTarget, targetPosition, easeProgress);

            // Update Sun's light position if it exists
            if (this.sunLight) {
                const sun = this.planets.find(p => p.name === 'Sun');
                if (sun) {
                    this.sunLight.position.copy(sun.mesh.position);
                    this.sunLight2.position.copy(sun.mesh.position);
                }
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    zoomIn() {
        this.camera.position.multiplyScalar(0.9);
    }

    zoomOut() {
        this.camera.position.multiplyScalar(1.1);
    }

    resetView() {
        this.camera.position.set(0, 0, 100);
        this.controls.target.set(0, 0, 0);
    }

    zoomToSun() {
        const sun = this.planets.find(p => p.name === 'Sun');
        if (sun) {
            const zoomDistance = 50; // Fixed distance to view the Sun
            
            // Calculate position to zoom to
            const targetPosition = sun.mesh.position.clone();
            const direction = new THREE.Vector3(0, 0, 1);
            const newPosition = targetPosition.clone().add(direction.multiplyScalar(zoomDistance));
            
            // Animate camera movement
            const startPosition = this.camera.position.clone();
            const startTime = performance.now();
            const duration = 1000; // 1 second

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease in-out function
                const easeProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : -1 + (4 - 2 * progress) * progress;

                this.camera.position.lerpVectors(startPosition, newPosition, easeProgress);
                this.controls.target.lerpVectors(this.controls.target, targetPosition, easeProgress);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        }
    }

    createPlanets() {
        const planetData = [
            {
                name: 'Sun',
                radius: 6.96,
                texture: '../scripts/simulations/textures/8k_sun.jpg',
                emissive: true
            },
            {
                name: 'Mercury',
                radius: 0.38,
                texture: '../scripts/simulations/textures/8k_mercury.jpg',
                distance: 5.8,
                rotationSpeed: 0.004,
                orbitSpeed: 0.04
            },
            {
                name: 'Venus',
                radius: 0.95,
                texture: '../scripts/simulations/textures/8k_venus_surface.jpg',
                distance: 10.8,
                rotationSpeed: 0.002,
                orbitSpeed: 0.015
            },
            {
                name: 'Earth',
                radius: 1.0,
                texture: '../scripts/simulations/textures/8k_earth_daymap.jpg',
                distance: 15,
                rotationSpeed: 0.01,
                orbitSpeed: 0.01,
                moons: [
                    {
                        name: 'Moon',
                        radius: 0.27,
                        texture: '../scripts/simulations/textures/8k_moon.jpg',
                        distance: 2,
                        orbitSpeed: 0.05,
                        rotationSpeed: 0.005
                    }
                ]
            },
            {
                name: 'Mars',
                radius: 0.53,
                texture: '../scripts/simulations/textures/8k_mars.jpg',
                distance: 22.8,
                rotationSpeed: 0.008,
                orbitSpeed: 0.008,
                moons: [
                    {
                        name: 'Phobos',
                        radius: 0.1,
                        texture: '../scripts/simulations/textures/8k_phobos.jpg',
                        distance: 1.5,
                        orbitSpeed: 0.1,
                        rotationSpeed: 0.01
                    },
                    {
                        name: 'Deimos',
                        radius: 0.08,
                        texture: '../scripts/simulations/textures/8k_deimos.jpg',
                        distance: 2,
                        orbitSpeed: 0.08,
                        rotationSpeed: 0.008
                    }
                ]
            },
            {
                name: 'Jupiter',
                radius: 11.2,
                texture: '../scripts/simulations/textures/8k_jupiter.jpg',
                distance: 77.8,
                rotationSpeed: 0.02,
                orbitSpeed: 0.002,
                moons: [
                    {
                        name: 'Io',
                        radius: 0.4,
                        texture: '../scripts/simulations/textures/8k_io.jpg',
                        distance: 4,
                        orbitSpeed: 0.1,
                        rotationSpeed: 0.01
                    },
                    {
                        name: 'Europa',
                        radius: 0.35,
                        texture: '../scripts/simulations/textures/8k_europa.jpg',
                        distance: 6,
                        orbitSpeed: 0.08,
                        rotationSpeed: 0.008
                    },
                    {
                        name: 'Ganymede',
                        radius: 0.5,
                        texture: '../scripts/simulations/textures/8k_ganymede.jpg',
                        distance: 8,
                        orbitSpeed: 0.06,
                        rotationSpeed: 0.006
                    },
                    {
                        name: 'Callisto',
                        radius: 0.45,
                        texture: '../scripts/simulations/textures/8k_callisto.jpg',
                        distance: 10,
                        orbitSpeed: 0.04,
                        rotationSpeed: 0.004
                    }
                ]
            },
            {
                name: 'Saturn',
                radius: 9.45,
                texture: '../scripts/simulations/textures/8k_saturn.jpg',
                distance: 143.4,
                rotationSpeed: 0.018,
                orbitSpeed: 0.0015,
                hasBelt: true,
                beltData: {
                    innerRadius: 12,
                    outerRadius: 15,
                    texture: '../scripts/simulations/textures/8k_saturn_ring_alpha.png'
                },
                moons: [
                    {
                        name: 'Titan',
                        radius: 0.4,
                        texture: '../scripts/simulations/textures/8k_titan.jpg',
                        distance: 8,
                        orbitSpeed: 0.05,
                        rotationSpeed: 0.005
                    },
                    {
                        name: 'Enceladus',
                        radius: 0.2,
                        texture: '../scripts/simulations/textures/8k_enceladus.jpg',
                        distance: 6,
                        orbitSpeed: 0.07,
                        rotationSpeed: 0.007
                    }
                ]
            },
            {
                name: 'Uranus',
                radius: 4.01,
                texture: '../scripts/simulations/textures/8k_uranus.jpg',
                distance: 287.1,
                rotationSpeed: 0.012,
                orbitSpeed: 0.001,
                hasBelt: true,
                beltData: {
                    innerRadius: 5,
                    outerRadius: 7,
                    texture: '../scripts/simulations/textures/8k_uranus_ring_alpha.png'
                }
            },
            {
                name: 'Neptune',
                radius: 3.88,
                texture: '../scripts/simulations/textures/8k_neptune.jpg',
                distance: 449.5,
                rotationSpeed: 0.014,
                orbitSpeed: 0.0008,
                moons: [
                    {
                        name: 'Triton',
                        radius: 0.3,
                        texture: '../scripts/simulations/textures/8k_triton.jpg',
                        distance: 5,
                        orbitSpeed: 0.06,
                        rotationSpeed: 0.006
                    }
                ]
            }
        ];

        // Create asteroid belt
        const asteroidBelt = {
            name: 'Asteroid Belt',
            hasBelt: true,
            beltData: {
                innerRadius: 30,
                outerRadius: 50,
                texture: '../scripts/simulations/textures/8k_asteroid_belt.jpg'
            }
        };

        // Create planets and add them to the scene
        planetData.forEach(data => {
            const planet = new Planet(data);
            this.planets.push(planet);
            this.scene.add(planet.mesh);
            if (planet.orbit) this.scene.add(planet.orbit);
            if (planet.belt) this.scene.add(planet.belt);
            if (planet.moonMeshes) {
                planet.moonMeshes.forEach(moon => {
                    planet.mesh.add(moon);
                });
            }

            // Add point light to the Sun
            if (data.name === 'Sun') {
                this.sunLight = new THREE.PointLight(0xffffff, 2, 0);
                this.sunLight.position.copy(planet.mesh.position);
                this.scene.add(this.sunLight);

                // Add a second point light for better illumination
                this.sunLight2 = new THREE.PointLight(0xffffff, 1, 0);
                this.sunLight2.position.copy(planet.mesh.position);
                this.scene.add(this.sunLight2);
            }
        });

        // Add asteroid belt
        const belt = new Planet(asteroidBelt);
        this.scene.add(belt.belt);
    }

    setupGUI() {
        const gui = new GUI();
        
        // Add planet visibility controls
        const visibilityFolder = gui.addFolder('Planet Visibility');
        this.planets.forEach(planet => {
            if (planet.name !== 'Sun') {
                visibilityFolder.add(planet, 'visible').name(planet.name);
            }
        });

        // Add view controls
        const viewFolder = gui.addFolder('View Controls');
        viewFolder.add(this, 'resetView').name('Reset View');
        viewFolder.add(this, 'zoomToSun').name('Focus on Sun');
        
        // Add center controls for each planet
        const centerFolder = gui.addFolder('Center on Planet');
        this.planets.forEach((planet, index) => {
            if (planet.name !== 'Sun') {
                centerFolder.add({ center: () => this.centerOnPlanet(planet) }, 'center').name(planet.name);
            }
        });

        // Add recording controls
        const recordingFolder = gui.addFolder('Recording');
        recordingFolder.add(this, 'toggleRecording').name('Record');
    }

    setupRecording() {
        const stream = this.renderer.domElement.captureStream(60);
        this.recorder = new RecordRTC(stream, {
            type: 'video',
            mimeType: 'video/webm',
            videoBitsPerSecond: 8000000
        });

        // Add record button to GUI
        const recordFolder = this.gui.addFolder('Recording');
        recordFolder.add(this, 'toggleRecording').name('Record');
    }

    toggleRecording() {
        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    startRecording() {
        this.recorder.startRecording();
        this.isRecording = true;
        this.recordingStatus.style.display = 'block';
        console.log('Recording started');
    }

    stopRecording() {
        this.recorder.stopRecording(() => {
            const blob = this.recorder.getBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'solar-system-recording.webm';
            a.click();
            URL.revokeObjectURL(url);
            this.isRecording = false;
            this.recordingStatus.style.display = 'none';
            console.log('Recording stopped and saved');
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update planet positions relative to the current center
        if (this.currentCenter && this.currentCenter.name !== 'Sun') {
            const centerPosition = this.currentCenter.mesh.position.clone();
            this.planets.forEach(planet => {
                if (planet !== this.currentCenter) {
                    const relativePosition = planet.mesh.position.clone().sub(centerPosition);
                    planet.mesh.position.copy(relativePosition);
                }
            });
            this.currentCenter.mesh.position.set(0, 0, 0);
        }

        // Update Sun's light position
        if (this.sunLight) {
            const sun = this.planets.find(p => p.name === 'Sun');
            if (sun) {
                this.sunLight.position.copy(sun.mesh.position);
                this.sunLight2.position.copy(sun.mesh.position);
            }
        }

        this.controls.update();
        this.planets.forEach(planet => planet.update());
        this.starField.update();

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the solar system
const solarSystem = new SolarSystem();

// Handle window resize
window.addEventListener('resize', () => {
    solarSystem.camera.aspect = window.innerWidth / window.innerHeight;
    solarSystem.camera.updateProjectionMatrix();
    solarSystem.renderer.setSize(window.innerWidth, window.innerHeight);
}); 