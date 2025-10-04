import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Get UI elements
const loadingScreen = document.getElementById('loading');
const progressText = document.getElementById('progress');
const errorDiv = document.getElementById('error');

// Show error function
function showError(message) {
    console.error(message);
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    40, 
    window.innerWidth / window.innerHeight, 
    0.1, 
    2000
);
camera.position.set(8, 2, 10);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 200;

// Add basic lighting as fallback
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Add a test cube to verify Three.js is working
const testGeometry = new THREE.BoxGeometry(1, 1, 1);
const testMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const testCube = new THREE.Mesh(testGeometry, testMaterial);
testCube.position.set(0, 0.5, 0);
testCube.castShadow = true;
scene.add(testCube);

// Add ground plane
// const groundGeometry = new THREE.PlaneGeometry(20, 20);
// const groundMaterial = new THREE.MeshStandardMaterial({ 
//     color: 0x333333,
//     roughness: 0.8,
//     metalness: 0.2
// });
// const ground = new THREE.Mesh(groundGeometry, groundMaterial);
// ground.rotation.x = -Math.PI / 2;
// ground.receiveShadow = true;
// scene.add(ground);

// Grid helper
// const gridHelper = new THREE.GridHelper(20, 20);
// scene.add(gridHelper);

// Loading manager
const loadingManager = new THREE.LoadingManager();

let totalItems = 0;
let loadedItems = 0;

loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
    console.log(`Started loading: ${url}`);
    totalItems = itemsTotal;
};

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    loadedItems = itemsLoaded;
    const percent = Math.floor((itemsLoaded / itemsTotal) * 100);
    progressText.textContent = `${percent}%`;
    console.log(`Loading: ${itemsLoaded}/${itemsTotal} - ${percent}%`);
};

loadingManager.onLoad = () => {
    console.log('All assets loaded successfully!');
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 500);
};

loadingManager.onError = (url) => {
    showError(`Failed to load: ${url}`);
};

// Try to load HDR environment
const rgbeLoader = new RGBELoader(loadingManager);
rgbeLoader.load(
    '/assets/planet-low-orbit_hdr.hdr',
    (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
        console.log('HDR loaded successfully');
    },
    (progress) => {
        if (progress.lengthComputable) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`HDR loading: ${percent.toFixed(2)}%`);
        }
    },
    (error) => {
        console.warn('HDR not found, using fallback environment');
        scene.background = new THREE.Color(0x1a1a1a);
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 1000);
    }
);

// Try to load GLTF model
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.load(
    '/assets/model_tjs.gltf',
    (gltf) => {
        // Remove test cube since model loaded
        scene.remove(testCube);
        
        scene.add(gltf.scene);
        
        // Enable shadows
        gltf.scene.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        
        // Center the model
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);
        
        console.log('Model loaded successfully');
    },
    (progress) => {
        if (progress.lengthComputable) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`Model loading: ${percent.toFixed(2)}%`);
        }
    },
    (error) => {
        console.warn('Model not found, showing test cube');
        showError('Model file not found. Showing test scene.');
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
        }, 1000);
    }
);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate test cube
    testCube.rotation.x += 0.01;
    testCube.rotation.y += 0.01;
    
    controls.update();
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Log initialization
console.log('Three.js initialized');
console.log('Trying to load assets from:');
console.log('- HDR: /assets/planet-low-orbit_hdr.hdr');
console.log('- Model: /assets/model_tjs.gltf');