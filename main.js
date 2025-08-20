document.addEventListener('DOMContentLoaded', () => {
    const modalOverlay = document.getElementById('language-modal-overlay');
    const langEnButton = document.getElementById('lang-en');
    const langJaButton = document.getElementById('lang-ja');

    let locales = {};
    let currentLanguage = 'en'; // Default language

    // Fetches the translations
    async function fetchLocales() {
        try {
            const response = await fetch('locales.json');
            if (!response.ok) {
                throw new Error('Failed to load locales');
            }
            locales = await response.json();
        } catch (error) {
            console.error(error);
            // Fallback to a minimal set of locales
            locales = {
                en: { lang_select_title: "Select Language", lang_en: "English", lang_ja: "日本語" },
                ja: { lang_select_title: "言語を選択してください", lang_en: "English", lang_ja: "日本語" }
            };
        }
    }

    // Updates the UI text based on the current language
    function updateUIText() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (locales[currentLanguage] && locales[currentLanguage][key]) {
                // Use textContent for most elements, but innerHTML could be used if needed
                el.textContent = locales[currentLanguage][key];
            }
        });
        // Also update the document title
        document.title = locales[currentLanguage]?.app_title || '3D CAD';
    }

    // Sets the language, saves it, and updates the UI
    function setLanguage(lang) {
        currentLanguage = lang;
        try {
            localStorage.setItem('language', lang);
        } catch (e) {
            console.error("Could not save language to localStorage.", e);
        }
        updateUIText();
    }

    // Handles the language selection and hides the modal
    function selectLanguage(lang) {
        setLanguage(lang);
        modalOverlay.classList.add('hidden');
    }

    // Initialization
    async function init() {
        await fetchLocales();

        let savedLang = null;
        try {
             savedLang = localStorage.getItem('language');
        } catch (e) {
            console.error("Could not read language from localStorage.", e);
        }


        if (savedLang && (savedLang === 'en' || savedLang === 'ja')) {
            setLanguage(savedLang);
            modalOverlay.classList.add('hidden');
        } else {
            // If no language is saved, show the modal
            // We need to populate the modal text itself before showing it.
            currentLanguage = 'en'; // Default to English for the modal text
            updateUIText();
            modalOverlay.classList.remove('hidden');
        }

        langEnButton.addEventListener('click', () => selectLanguage('en'));
        langJaButton.addEventListener('click', () => selectLanguage('ja'));

        const newProjectButton = document.getElementById('new-project-btn');
        newProjectButton.addEventListener('click', () => {
            window.location.href = 'editor.html';
        });

        const loadFileButton = document.getElementById('load-file-btn');
        const fileImporter = document.getElementById('file-importer');

        loadFileButton.addEventListener('click', () => {
            fileImporter.click();
        });

        fileImporter.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                importProject(file);
            }
            // Reset the input value to allow re-importing the same file
            event.target.value = null;
        });

        loadAndDisplayProjects();
    }

    function loadAndDisplayProjects() {
        const projectList = document.getElementById('project-list');
        projectList.innerHTML = ''; // Clear existing list

        let projects = [];
        try {
            projects = JSON.parse(localStorage.getItem('cad_projects')) || [];
        } catch (e) {
            console.error("Could not load projects from localStorage", e);
            projectList.textContent = 'Error loading projects.';
            return;
        }

        // Sort projects by most recently modified
        projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

        if (projects.length === 0) {
            // The :empty pseudo-class in CSS will handle the message
            return;
        }

        projects.forEach(project => {
            const projectCard = document.createElement('a');
            projectCard.href = `editor.html?id=${project.id}`;
            projectCard.className = 'project-card';

            const projectName = document.createElement('h3');
            projectName.textContent = project.name;

            const projectDate = document.createElement('p');
            projectDate.textContent = `Last modified: ${new Date(project.lastModified).toLocaleString()}`;

            projectCard.appendChild(projectName);
            projectCard.appendChild(projectDate);
            projectList.appendChild(projectCard);
        });
    }

    init();

    function importProject(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const sceneData = JSON.parse(e.target.result);

                // Basic validation
                if (!sceneData.objects || !Array.isArray(sceneData.objects)) {
                    throw new Error("Invalid project file format.");
                }

                // Create a new project from the imported data
                const projectName = file.name.replace(/\.json$/i, '') || "Imported Project";
                const newProject = {
                    id: `proj_${Date.now()}`,
                    name: projectName,
                    lastModified: new Date().toISOString(),
                    scene: sceneData
                };

                const existingProjects = JSON.parse(localStorage.getItem('cad_projects')) || [];
                existingProjects.push(newProject);
                localStorage.setItem('cad_projects', JSON.stringify(existingProjects));

                alert(`Project "${projectName}" imported successfully!`);
                window.location.href = `editor.html?id=${newProject.id}`;

            } catch (error) {
                console.error("Failed to import project:", error);
                alert(`Error importing file: ${error.message}`);
            }
        };

        reader.onerror = () => {
            alert(`Error reading file: ${reader.error}`);
        };

        reader.readAsText(file);
    }
});
