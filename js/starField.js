import * as THREE from 'three';
const GALAXY_RADIUS = 5000 * 1.1;  // 10% margin

export class StarField {
    constructor(scene) {
        this.scene = scene;
        this.createBackground();
    }

    createBackground() {
        // Create a large sphere for the background
        const geometry = new THREE.SphereGeometry(GALAXY_RADIUS, 64, 64);
        const textureLoader = new THREE.TextureLoader();
        
        // Load the Milky Way texture
        const material = new THREE.MeshBasicMaterial({
            map: textureLoader.load('textures/8k_stars_milky_way.jpg'),
            side: THREE.BackSide
        });

        this.background = new THREE.Mesh(geometry, material);
        this.scene.add(this.background);
    }

    update() {
        // Add subtle rotation to the background
        this.background.rotation.y += 0.00005;
    }
} 