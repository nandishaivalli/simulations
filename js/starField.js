import * as THREE from 'three';

export class StarField {
    constructor(scene) {
        this.scene = scene;
        this.createBackground();
    }

    createBackground() {
        // Create a large sphere for the background
        const geometry = new THREE.SphereGeometry(1000, 32, 32);
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