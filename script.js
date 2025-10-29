
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// ========== UI Elements ==========
const loadingScreen = document.getElementById('loading');
const progressText = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const errorDiv = document.getElementById('error');
const fileInfo = document.getElementById('fileInfo');
const speedInfo = document.getElementById('speedInfo');
const loadingStatus = document.getElementById('loadingStatus');
const timeRemaining = document.getElementById('timeRemaining');

// ========== App State ==========
let appState = {
    autoRotate: false,
    wireframe: false,
    showGrid: false,
    showAxes: false,
    shadows: true,
    annotationMode: false,
    loadedModel: null,
    hdrTexture: null,
    annotations: [],
    cameraPresets: [],
    originalMaterials: new Map()
};

// ========== Loading Stats ==========
let loadingStats = {
    startTime: Date.now(),
    lastLoaded: 0,
    lastTime: Date.now(),
    currentFile: '',
    currentFileSize: 0
};

// ========== Helper Functions ==========
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateSpeed(bytesLoaded, timeElapsed) {
    if (timeElapsed === 0) return '0 KB/s';
    const bytesPerSecond = (bytesLoaded * 1000) / timeElapsed;
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateTimeRemaining(loaded, total, speed) {
    if (!speed || speed === '0 KB/s' || loaded >= total) {
        timeRemaining.textContent = '';
        return '';
    }
    const remaining = total - loaded;
    const speedMatch = speed.match(/([\d.]+)\s*(\w+\/s)/);
    if (!speedMatch) return '';
    
    const speedValue = parseFloat(speedMatch[1]);
    const speedUnit = speedMatch[2];
    
    let bytesPerSecond = speedValue;
    if (speedUnit.includes('KB')) bytesPerSecond *= 1024;
    else if (speedUnit.includes('MB')) bytesPerSecond *= 1024 * 1024;
    else if (speedUnit.includes('GB')) bytesPerSecond *= 1024 * 1024 * 1024;
    
    if (bytesPerSecond === 0) return '';
    const secondsRemaining = remaining / bytesPerSecond;
    
    if (secondsRemaining < 60) {
        return `~${Math.ceil(secondsRemaining)}s remaining`;
    } else {
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = Math.ceil(secondsRemaining % 60);
        return `~${minutes}m ${seconds}s remaining`;
    }
}

function updateProgress(overallPercent, loaded, total, fileName, speed) {
    const percent = Math.min(Math.floor(overallPercent), 100);
    progressText.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
    
    fileInfo.textContent = `${fileName}: ${formatBytes(loaded)} / ${formatBytes(total)}`;
    speedInfo.textContent = `Download Speed: ${speed}`;
    
    const timeRemainingText = calculateTimeRemaining(loaded, total, speed);
    if (timeRemainingText) {
        timeRemaining.textContent = timeRemainingText;
    }
}


function showError(message) {
    console.error(message);
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// ========== Scene Setup ==========
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(8, 2, 10);

const defaultCameraPosition = camera.position.clone();
const defaultCameraRotation = camera.rotation.clone();

// ========== Renderer Setup ==========
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ========== Controls ==========
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 200;

// ========== Lighting ==========
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// ========== Grid & Axes ==========
const gridHelper = new THREE.GridHelper(20, 20);
gridHelper.visible = false;
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(5);
axesHelper.visible = false;
scene.add(axesHelper);

// ========== Test Cube ==========
const testGeometry = new THREE.BoxGeometry(1, 1, 1);
const testMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const testCube = new THREE.Mesh(testGeometry, testMaterial);
testCube.position.set(0, 0.5, 0);
testCube.castShadow = true;
scene.add(testCube);

// ========== Loading Manager ==========
const loadingManager = new THREE.LoadingManager();

loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
    console.log(`Started loading: ${url}`);
    loadingStatus.textContent = `Loading asset ${itemsLoaded + 1} of ${itemsTotal}`;
};

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    loadingStatus.textContent = `Loading asset ${itemsLoaded} of ${itemsTotal}`;
};

loadingManager.onLoad = () => {
    console.log('All assets loaded!');
    fileInfo.textContent = 'Loading Complete!';
    speedInfo.textContent = '✓ All assets loaded';
    loadingStatus.textContent = 'Initializing 3D scene...';
    timeRemaining.textContent = '';
    progressText.textContent = '100%';
    progressBar.style.width = '100%';
    
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 800);
};

loadingManager.onError = (url) => {
    showError(`Failed to load: ${url}`);
};

// ========== Load HDR ==========
const rgbeLoader = new RGBELoader(loadingManager);
rgbeLoader.load(
    '/assets/planet-low-orbit_hdr.hdr',
    (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
        appState.hdrTexture = texture;
    },
    (progress) => {
        loadingStats.currentFile = 'HDR Environment';
        if (progress.lengthComputable) {
            const currentTime = Date.now();
            const timeDiff = currentTime - loadingStats.lastTime;
            const bytesDiff = progress.loaded - loadingStats.lastLoaded;
            
            if (timeDiff > 100 || progress.loaded === progress.total) {
                const speed = calculateSpeed(bytesDiff, timeDiff);
                loadingStats.lastLoaded = progress.loaded;
                loadingStats.lastTime = currentTime;
                // HDR contributes to the first 50% of the loading bar
                const overallPercent = (progress.loaded / progress.total) * 50;
                updateProgress(overallPercent, progress.loaded, progress.total, loadingStats.currentFile, speed);
            }
        }
    },
    (error) => {
        console.warn('HDR not found');
        scene.background = new THREE.Color(0x1a1a1a);
    }
);

// ========== Load Model ==========
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.load(
    '/assets/model_tjs.gltf',
    (gltf) => {
        scene.remove(testCube);
        scene.add(gltf.scene);
        appState.loadedModel = gltf.scene;
        
        gltf.scene.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                appState.originalMaterials.set(node, node.material.clone());
            }
        });
        
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);
        
        updateModelStats();
    },
    (progress) => {
        loadingStats.currentFile = '3D Model';
        if (progress.lengthComputable) {
            const currentTime = Date.now();
            const timeDiff = currentTime - loadingStats.lastTime;
            const bytesDiff = progress.loaded - loadingStats.lastLoaded;
            
            if (timeDiff > 100 || progress.loaded === progress.total) {
                const speed = calculateSpeed(bytesDiff, timeDiff);
                loadingStats.lastLoaded = progress.loaded;
                loadingStats.lastTime = currentTime;
                // Model contributes to the second 50% of the loading bar
                const overallPercent = 50 + (progress.loaded / progress.total) * 50;
                updateProgress(overallPercent, progress.loaded, progress.total, loadingStats.currentFile, speed);
            }
        }
    },
    (error) => {
        console.warn('Model not found');
        showError('Model not found. Showing test scene.');
    }
);

// ========== FPS Counter ==========
let fps = 60;
let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
    frameCount++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        document.getElementById('fpsCounter').textContent = `${fps} FPS`;
        frameCount = 0;
        lastTime = currentTime;
    }
}

// ========== Update Stats ==========
function updateModelStats() {
    let vertices = 0, triangles = 0, textures = 0;
    
    scene.traverse((obj) => {
        if (obj.isMesh) {
            if (obj.geometry) {
                const positions = obj.geometry.attributes.position;
                if (positions) vertices += positions.count;
                if (obj.geometry.index) {
                    triangles += obj.geometry.index.count / 3;
                } else {
                    triangles += positions.count / 3;
                }
            }
            if (obj.material) {
                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                materials.forEach(mat => {
                    if (mat.map) textures++;
                });
            }
        }
    });
    
    document.getElementById('verticesCount').textContent = vertices.toLocaleString();
    document.getElementById('trianglesCount').textContent = Math.floor(triangles).toLocaleString();
    document.getElementById('texturesCount').textContent = textures;
    document.getElementById('drawCalls').textContent = renderer.info.render.calls;
    
    const memory = (renderer.info.memory.geometries + renderer.info.memory.textures) * 0.001;
    document.getElementById('memoryUsage').textContent = memory.toFixed(2) + ' MB';
}

// ========== Button Handlers ==========
document.getElementById('resetCameraBtn').addEventListener('click', resetCamera);
document.getElementById('autoRotateBtn').addEventListener('click', toggleAutoRotate);
document.getElementById('wireframeBtn').addEventListener('click', toggleWireframe);
document.getElementById('screenshotBtn').addEventListener('click', takeScreenshot);
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
document.getElementById('settingsBtn').addEventListener('click', toggleSettings);
document.getElementById('helpBtn').addEventListener('click', toggleHelp);
document.getElementById('shadowsBtn').addEventListener('click', toggleShadows);
document.getElementById('gridBtn').addEventListener('click', toggleGrid);
document.getElementById('axesBtn').addEventListener('click', toggleAxes);

function resetCamera() {
    camera.position.copy(defaultCameraPosition);
    camera.rotation.copy(defaultCameraRotation);
    controls.target.set(0, 0, 0);
    controls.update();
}

function toggleAutoRotate() {
    appState.autoRotate = !appState.autoRotate;
    controls.autoRotate = appState.autoRotate;
    controls.autoRotateSpeed = 2.0;
    document.getElementById('autoRotateBtn').classList.toggle('active', appState.autoRotate);
}

function toggleWireframe() {
    appState.wireframe = !appState.wireframe;
    scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach(mat => mat.wireframe = appState.wireframe);
        }
    });
    document.getElementById('wireframeBtn').classList.toggle('active', appState.wireframe);
}

function takeScreenshot() {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = `3d-viewer-${Date.now()}.png`;
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'block' : 'none';
}

function toggleHelp() {
    const help = document.getElementById('shortcutsHelp');
    help.style.display = help.style.display === 'none' || help.style.display === '' ? 'block' : 'none';
}

function toggleShadows() {
    appState.shadows = !appState.shadows;
    renderer.shadowMap.enabled = appState.shadows;
    directionalLight.castShadow = appState.shadows;
    document.getElementById('shadowsBtn').classList.toggle('active', appState.shadows);
}

function toggleGrid() {
    appState.showGrid = !appState.showGrid;
    gridHelper.visible = appState.showGrid;
    document.getElementById('gridBtn').classList.toggle('active', appState.showGrid);
}

function toggleAxes() {
    appState.showAxes = !appState.showAxes;
    axesHelper.visible = appState.showAxes;
    document.getElementById('axesBtn').classList.toggle('active', appState.showAxes);
}

// ========== Settings Controls ==========
document.getElementById('qualityPreset').addEventListener('change', (e) => {
    const quality = e.target.value;
    switch(quality) {
        case 'low':
            renderer.setPixelRatio(1);
            renderer.shadowMap.enabled = false;
            break;
        case 'medium':
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            renderer.shadowMap.enabled = true;
            break;
        case 'high':
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            break;
        case 'ultra':
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            break;
    }
});

document.getElementById('backgroundPreset').addEventListener('change', (e) => {
    const bg = e.target.value;
    const customGroup = document.getElementById('customColorGroup');
    
    switch(bg) {
        case 'hdr':
            if (appState.hdrTexture) {
                scene.background = appState.hdrTexture;
            }
            customGroup.style.display = 'none';
            break;
        case 'black':
            scene.background = new THREE.Color(0x000000);
            customGroup.style.display = 'none';
            break;
        case 'white':
            scene.background = new THREE.Color(0xffffff);
            customGroup.style.display = 'none';
            break;
        case 'gray':
            scene.background = new THREE.Color(0x808080);
            customGroup.style.display = 'none';
            break;
        case 'gradient':
            scene.background = new THREE.Color(0x1a1a2e);
            customGroup.style.display = 'none';
            break;
        case 'custom':
            customGroup.style.display = 'block';
            break;
    }
});

document.getElementById('customBgColor').addEventListener('input', (e) => {
    scene.background = new THREE.Color(e.target.value);
});

document.getElementById('lightingPreset').addEventListener('change', (e) => {
    const preset = e.target.value;
    
    switch(preset) {
        case 'default':
            ambientLight.intensity = 2;
            directionalLight.intensity = 3;
            directionalLight.position.set(5, 10, 5);
            break;
        case 'studio':
            ambientLight.intensity = 1.5;
            directionalLight.intensity = 4;
            directionalLight.position.set(0, 10, 0);
            break;
        case 'outdoor':
            ambientLight.intensity = 3;
            directionalLight.intensity = 5;
            directionalLight.position.set(10, 10, 10);
            break;
        case 'dramatic':
            ambientLight.intensity = 0.5;
            directionalLight.intensity = 8;
            directionalLight.position.set(-5, 5, -5);
            break;
        case 'soft':
            ambientLight.intensity = 4;
            directionalLight.intensity = 1;
            directionalLight.position.set(5, 10, 5);
            break;
    }
});

document.getElementById('shadowQuality').addEventListener('input', (e) => {
    const quality = parseInt(e.target.value);
    const sizes = [512, 1024, 2048, 4096];
    const labels = ['Off', 'Low', 'Medium', 'High'];
    
    document.getElementById('shadowQualityValue').textContent = labels[quality];
    
    if (quality === 0) {
        renderer.shadowMap.enabled = false;
    } else {
        renderer.shadowMap.enabled = true;
        directionalLight.shadow.mapSize.width = sizes[quality];
        directionalLight.shadow.mapSize.height = sizes[quality];
        directionalLight.shadow.map?.dispose();
        directionalLight.shadow.map = null;
    }
});

document.getElementById('fovSlider').addEventListener('input', (e) => {
    const fov = parseFloat(e.target.value);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    document.getElementById('fovValue').textContent = fov;
});

document.getElementById('exposureSlider').addEventListener('input', (e) => {
    const exposure = parseFloat(e.target.value);
    renderer.toneMappingExposure = exposure;
    document.getElementById('exposureValue').textContent = exposure.toFixed(1);
});

document.getElementById('roughnessSlider').addEventListener('input', (e) => {
    const roughness = parseFloat(e.target.value);
    scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach(mat => {
                if (mat.roughness !== undefined) mat.roughness = roughness;
            });
        }
    });
    document.getElementById('roughnessValue').textContent = roughness.toFixed(2);
});

document.getElementById('metalnessSlider').addEventListener('input', (e) => {
    const metalness = parseFloat(e.target.value);
    scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach(mat => {
                if (mat.metalness !== undefined) mat.metalness = metalness;
            });
        }
    });
    document.getElementById('metalnessValue').textContent = metalness.toFixed(2);
});

document.getElementById('modelColor').addEventListener('input', (e) => {
    const color = new THREE.Color(e.target.value);
    scene.traverse((obj) => {
        if (obj.isMesh && obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach(mat => {
                if (mat.color) mat.color.copy(color);
            });
        }
    });
});

// ========== Keyboard Shortcuts ==========
document.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'r':
            resetCamera();
            break;
        case ' ':
            e.preventDefault();
            toggleAutoRotate();
            break;
        case 'w':
            toggleWireframe();
            break;
        case 's':
            takeScreenshot();
            break;
        case 'f':
            toggleFullscreen();
            break;
        case 'g':
            toggleSettings();
            break;
        case 't':
            toggleGrid();
            break;
        case 'h':
            toggleHelp();
            break;
        case 'escape':
            document.getElementById('shortcutsHelp').style.display = 'none';
            document.getElementById('settingsPanel').style.display = 'none';
            break;
    }
});

// ========== Animation Loop ==========
function animate() {
    requestAnimationFrame(animate);
    
    testCube.rotation.x += 0.01;
    testCube.rotation.y += 0.01;
    
    controls.update();
    renderer.render(scene, camera);
    
    updateFPS();
    updateModelStats();
}

animate();

// ========== Window Resize ==========
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========== Initialize ==========
console.log('Advanced 3D Viewer initialized');
console.log('Press H for keyboard shortcuts');
document.getElementById('shadowsBtn').classList.add('active');
