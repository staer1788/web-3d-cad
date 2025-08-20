import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

function main() {
    let cube; // Make cube accessible in the main function scope
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(5, 5, 5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('lightgrey');

    // Add lighting
    {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, 2, 4);
        scene.add(light);
        const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
        scene.add(ambientLight);
    }

    // Add a grid helper
    const size = 10;
    const divisions = 10;
    const gridHelper = new THREE.GridHelper(size, divisions);
    scene.add(gridHelper);

    // This function will set up the scene, either new or from data
    function setupScene(projectData) {
        // Add a sample cube
        const boxWidth = projectData?.scene.objects[0].geometry.width || 1;
        const boxHeight = projectData?.scene.objects[0].geometry.height || 1;
        const boxDepth = projectData?.scene.objects[0].geometry.depth || 1;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

        const color = projectData?.scene.objects[0].material.color || 0x44aa88;
        const material = new THREE.MeshPhongMaterial({ color: color });

        cube = new THREE.Mesh(geometry, material);

        if (projectData) {
            const obj = projectData.scene.objects[0];
            cube.position.copy(obj.position);
            cube.rotation.set(obj.rotation._x, obj.rotation._y, obj.rotation._z);
            cube.scale.copy(obj.scale);
        } else {
            cube.position.set(0, 0.5, 0);
        }

        scene.add(cube);
    }

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
        return needResize;
    }

    function animate() {
        resizeRendererToDisplaySize(renderer);
        controls.update(); // only required if controls.enableDamping or controls.autoRotate are set to true
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

    function saveProject() {
        try {
            const existingProjects = JSON.parse(localStorage.getItem('cad_projects')) || [];
            let projectData;

            if (currentProjectId) {
                // Update existing project
                projectData = existingProjects.find(p => p.id === currentProjectId);
                if (!projectData) {
                    alert("Error: Project to update not found!");
                    return;
                }
            } else {
                // Create new project
                const projectName = prompt("Enter a name for your project:", "My Project");
                if (!projectName) {
                    return; // Silently cancel
                }
                projectData = {
                    id: `proj_${Date.now()}`,
                    name: projectName,
                };
            }

            // Update scene data and timestamp
            projectData.lastModified = new Date().toISOString();
            projectData.scene = {
                objects: [
                    {
                        uuid: cube.uuid,
                        type: 'Mesh',
                        geometry: { type: 'BoxGeometry', width: 1, height: 1, depth: 1 },
                        material: { type: 'MeshPhongMaterial', color: `#${cube.material.color.getHexString()}` },
                        position: cube.position.clone(),
                        rotation: cube.rotation.clone(),
                        scale: cube.scale.clone(),
                    }
                ]
            };

            if (currentProjectId) {
                // It's already in the array, so we just need to save
            } else {
                // Add the new project to the array
                existingProjects.push(projectData);
            }

            localStorage.setItem('cad_projects', JSON.stringify(existingProjects));
            alert(`Project "${projectData.name}" saved!`);
            window.location.href = '/'; // Redirect to home

        } catch (e) {
            console.error("Failed to save project to localStorage", e);
            alert("Error: Could not save the project.");
        }
    }

    const saveButton = document.getElementById('save-btn');
    saveButton.addEventListener('click', saveProject);

    const exportButton = document.getElementById('export-btn');
    exportButton.addEventListener('click', exportProject);

    function exportProject() {
        // We'll create a stripped-down version of the project data for export
        const sceneData = {
            objects: [
                {
                    uuid: cube.uuid,
                    type: 'Mesh',
                    geometry: { type: 'BoxGeometry', width: 1, height: 1, depth: 1 },
                    material: { type: 'MeshPhongMaterial', color: `#${cube.material.color.getHexString()}` },
                    position: cube.position.clone(),
                    rotation: cube.rotation.clone(),
                    scale: cube.scale.clone(),
                }
            ]
        };

        const dataStr = JSON.stringify(sceneData, null, 2);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'project.json';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }

    // --- Initialization ---
    let currentProjectId = null;
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (projectId) {
        try {
            const projects = JSON.parse(localStorage.getItem('cad_projects')) || [];
            const project = projects.find(p => p.id === projectId);
            if (project) {
                currentProjectId = projectId;
                setupScene(project);
            } else {
                alert("Project not found!");
                setupScene(null); // Start a new scene
            }
        } catch (e) {
            alert("Error loading project.");
            setupScene(null);
        }
    } else {
        setupScene(null); // No ID, so start a new scene
    }
}

main();
