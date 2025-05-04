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
        this.angle = Math.random() * Math.PI * 2;
        this.visible = true;
        this.emissive = data.emissive || false;
        this.moons = data.moons || [];
        this.hasBelt = data.hasBelt || false;
        this.beltData = data.beltData || null;

        this.mesh = this.createMesh();
        this.orbit = this.createOrbit();
        this.belt = this.hasBelt ? this.createBelt() : null;
        this.moonMeshes = this.createMoons();
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(this.radius, 64, 64);
        const textureLoader = new THREE.TextureLoader();
        
        // Define texture maps for each planet
        const textureMaps = {
            'Sun': {
                map: 'textures/8k_sun.jpg',
                emissive: true
            },
            'Mercury': {
                map: 'textures/8k_mercury.jpg',
                reflectivity: 0.1
            },
            'Venus': {
                map: '8k_venus_surface.jpg',
                atmosphere: '4k_venus_atmosphere.jpg',
                reflectivity: 0.3
            },
            'Earth': {
                map: 'textures/8k_earth_daymap.jpg',
                normalMap: 'textures/8k_earth_normal_map.tif',
                specularMap: 'textures/8k_earth_specular_map.tif',
                clouds: 'textures/8k_earth_clouds.jpg',
                nightMap: 'textures/8k_earth_nightmap.jpg',
                reflectivity: 0.2
            },
            'Mars': {
                map: 'textures/8k_mars.jpg',
                reflectivity: 0.15
            },
            'Jupiter': {
                map: 'textures/8k_jupiter.jpg',
                reflectivity: 0.25
            },
            'Saturn': {
                map: 'textures/8k_saturn.jpg',
                reflectivity: 0.3
            },
            'Uranus': {
                map: 'textures/8k_uranus.jpg',
                reflectivity: 0.2
            },
            'Neptune': {
                map: 'textures/8k_neptune.jpg',
                reflectivity: 0.2
            },
            'Pluto': {
                map: 'textures/8k_pluto.jpg'
            }
        };

        const planetTextures = textureMaps[this.name] || {};
        const materialOptions = {
            map: textureLoader.load(planetTextures.map),
            specular: new THREE.Color(0x333333),
            shininess: 5,
            reflectivity: planetTextures.reflectivity || 0.1
        };

        // Special handling for the Sun
        if (this.name === 'Sun' || this.emissive) {
            materialOptions.emissive = new THREE.Color(0xffffff);
            materialOptions.emissiveMap = textureLoader.load(planetTextures.map);
            materialOptions.emissiveIntensity = 1;
            materialOptions.depthWrite = false;
            materialOptions.blending = THREE.AdditiveBlending;
        }

        // Add normal map if available
        if (planetTextures.normalMap) {
            materialOptions.normalMap = textureLoader.load(planetTextures.normalMap);
            materialOptions.normalScale = new THREE.Vector2(0.5, 0.5);
        }

        // Add specular map if available
        if (planetTextures.specularMap) {
            materialOptions.specularMap = textureLoader.load(planetTextures.specularMap);
        }

        const material = new THREE.MeshPhongMaterial(materialOptions);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);

        // Special handling for Earth's clouds
        if (this.name === 'Earth' && planetTextures.clouds) {
            const cloudGeometry = new THREE.SphereGeometry(this.radius * 1.01, 64, 64);
            const cloudMaterial = new THREE.MeshPhongMaterial({
                map: textureLoader.load(planetTextures.clouds),
                transparent: true,
                opacity: 0.4,
                reflectivity: 0.3
            });
            this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
            this.mesh.add(this.clouds);
        }

        // Special handling for Saturn's rings
        if (this.name === 'Saturn') {
            const ringGeometry = new THREE.RingGeometry(this.radius * 1.5, this.radius * 2, 64);
            const ringMaterial = new THREE.MeshPhongMaterial({
                map: textureLoader.load('textures/8k_saturn_ring_alpha.png'),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
                reflectivity: 0.4
            });
            this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
            this.rings.rotation.x = Math.PI / 2;
            this.mesh.add(this.rings);
        }

        return this.mesh;
    }

    createOrbit() {
        if (this.distance === 0) return null;
        
        const orbitGeometry = new THREE.RingGeometry(this.distance - 0.1, this.distance + 0.1, 64);
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.05,
            depthWrite: false
        });
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        return orbit;
    }

    createBelt() {
        if (!this.hasBelt || !this.beltData) return null;

        const beltGeometry = new THREE.RingGeometry(
            this.beltData.innerRadius,
            this.beltData.outerRadius,
            64
        );
        const beltMaterial = new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load(`${this.beltData.texture}`),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.rotation.x = Math.PI / 2;
        return belt;
    }

    createMoons() {
        return this.moons.map(moonData => {
            const moonGeometry = new THREE.SphereGeometry(moonData.radius, 32, 32);
            const moonMaterial = new THREE.MeshPhongMaterial({
                map: new THREE.TextureLoader().load(moonData.texture),
                specular: new THREE.Color(0x333333),
                shininess: 5,
                reflectivity: 0.2
            });
            const moon = new THREE.Mesh(moonGeometry, moonMaterial);
            moon.userData = { orbitSpeed: moonData.orbitSpeed, distance: moonData.distance };
            return moon;
        });
    }

    update() {
        if (!this.visible) {
            this.mesh.visible = false;
            if (this.clouds) this.clouds.visible = false;
            if (this.rings) this.rings.visible = false;
            if (this.orbit) this.orbit.visible = false;
            return;
        }

        this.mesh.visible = true;
        if (this.clouds) this.clouds.visible = true;
        if (this.rings) this.rings.visible = true;
        if (this.orbit) this.orbit.visible = true;
        
        // Rotate the planet
        this.mesh.rotation.y += this.rotationSpeed;
        if (this.clouds) this.clouds.rotation.y += this.rotationSpeed * 1.1;

        // Orbit around the sun
        if (this.name !== 'Sun') {
            this.angle += this.orbitSpeed;
            this.mesh.position.x = Math.cos(this.angle) * this.distance;
            this.mesh.position.z = Math.sin(this.angle) * this.distance;
            
            if (this.orbit) {
                this.orbit.position.x = 0;
                this.orbit.position.z = 0;
            }
        }

        // Update moons
        this.moonMeshes.forEach((moon, index) => {
            const moonData = this.moons[index];
            const time = Date.now() * 0.001;
            moon.position.x = Math.cos(time * moonData.orbitSpeed) * moonData.distance;
            moon.position.z = Math.sin(time * moonData.orbitSpeed) * moonData.distance;
            moon.rotation.y += moonData.rotationSpeed || 0.01;
        });
    }
} 