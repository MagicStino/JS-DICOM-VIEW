/**
 * File Manager Module
 * Handles ZIP loading and file tree management
 */

class FileManager {
    constructor() {
        this.fileTreeElement = document.getElementById('fileTree');
        this.zipEntries = {};
        this.onFileSelected = null; // Callback when a file is selected
        this.autoLoadEnabled = true; // Whether to automatically load selected files
        this.selectedFilePath = null; // Currently selected file path
    }

    /**
     * Sets the callback to be called when a file is selected
     * @param {Function} callback - Function to call with file path
     */
    setFileSelectedCallback(callback) {
        this.onFileSelected = callback;
    }

    /**
     * Enables or disables automatic loading
     * @param {boolean} enabled - Whether auto-loading should be enabled
     */
    setAutoLoadEnabled(enabled) {
        this.autoLoadEnabled = enabled;
    }

    /**
     * Gets the currently selected file path
     * @returns {string|null} The currently selected file path
     */
    getSelectedFilePath() {
        return this.selectedFilePath;
    }

    /**
     * Loads a ZIP file and processes its contents
     * @param {File} file - The ZIP file to load
     * @returns {Promise} - Resolves with success status
     */
    async loadZipFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        if (!file.name.toLowerCase().endsWith('.zip')) {
            throw new Error('Selected file is not a ZIP archive');
        }

        try {
            // Load ZIP
            const zip = await JSZip.loadAsync(file);
            this.zipEntries = {};

            // Simple flat list of all files
            const fileList = [];

            // Process ZIP entries
            for (const path in zip.files) {
                const entry = zip.files[path];
                this.zipEntries[path] = entry;

                if (!entry.dir) {
                    fileList.push({
                        path: path,
                        name: path.split('/').pop(),
                        isDir: false,
                        // Check if it's an image/dicom file
                        isDicomOrImage: path.toLowerCase().endsWith('.dcm') ||
                                      path.toLowerCase().includes('image') ||
                                      path.match(/\.(dcm|img|png|jpg|jpeg|gif)$/i)
                    });
                }
            }

            // Generate a structured tree view
            this.generateFileTree(fileList);
            return true;
        } catch (error) {
            console.error('Error loading ZIP:', error);
            throw error;
        }
    }

    /**
     * Generate a file tree structure from flat file list
     * @param {Array} fileList - List of files to organize
     */
    generateFileTree(fileList) {
        // Create a more robust tree structure
        const tree = {};

        // Add all directories from file paths
        for (const file of fileList) {
            const parts = file.path.split('/');
            let currentPath = '';

            // Add each directory level to the tree
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!part) continue;

                currentPath = currentPath ? currentPath + '/' + part : part;

                if (!tree[currentPath]) {
                    tree[currentPath] = {
                        name: part,
                        path: currentPath,
                        isDir: true,
                        children: []
                    };
                }
            }

            // Add the file to its parent directory
            const dirPath = parts.slice(0, -1).join('/');
            if (!tree[dirPath]) {
                tree[dirPath] = {
                    name: dirPath.split('/').pop() || '',
                    path: dirPath,
                    isDir: true,
                    children: []
                };
            }

            tree[dirPath].children.push(file);
        }

        // Build parent-child relationships
        for (const path in tree) {
            const dir = tree[path];
            const parentPath = path.split('/').slice(0, -1).join('/');

            if (parentPath && tree[parentPath]) {
                // Add dir to parent's children
                tree[parentPath].children.push(dir);
            }
        }

        // Find root directories (those with no parent)
        const rootDirs = [];
        for (const path in tree) {
            const dir = tree[path];
            const parentPath = path.split('/').slice(0, -1).join('/');

            if (!parentPath || !tree[parentPath]) {
                rootDirs.push(dir);
            }
        }

        // Render the tree
        this.renderFileTree(rootDirs, fileList.filter(f => !f.path.includes('/')));

        // Set up drag and drop functionality
        this.setupDragAndDrop();
    }

    /**
     * Load the selected file directly instead of using the load button
     */
    triggerAutoLoad() {
        if (this.autoLoadEnabled && this.selectedFilePath) {
            // Only auto-load if we have a selected file path
            if (this.selectedFilePath) {
                console.log("Auto-loading file:", this.selectedFilePath);
                
                // Call the loadDicomFile method directly on the viewer
                if (window.viewer && window.viewer.loadDicomFile) {
                    window.viewer.loadDicomFile(this.selectedFilePath);
                }
            }
        }
    }

    /**
     * Render the file tree in the UI
     * @param {Array} rootDirs - Root directories
     * @param {Array} rootFiles - Root files
     */
    renderFileTree(rootDirs, rootFiles) {
        let html = '';

        // Add root directories
        for (const dir of rootDirs) {
            html += this.createFolderItem(dir);
        }

        // Add root files
        for (const file of rootFiles) {
            html += this.createFileItem(file);
        }

        this.fileTreeElement.innerHTML = html;

        // Add click handlers
        document.querySelectorAll('.tree-folder').forEach(folder => {
            folder.addEventListener('click', (e) => {
                const path = e.currentTarget.getAttribute('data-path');
                const childrenDiv = document.getElementById('children-' + path.replace(/[\/.]/g, '_'));

                if (childrenDiv) {
                    childrenDiv.style.display = childrenDiv.style.display === 'none' ? 'block' : 'none';
                }
            });
        });

        const self = this; // Store reference to this for use in event handlers

        document.querySelectorAll('.tree-file').forEach(file => {
            file.addEventListener('click', function(e) {
                const path = this.getAttribute('data-path');
                self.selectedFilePath = path;

                // Clear selection
                document.querySelectorAll('.tree-item.selected').forEach(el => {
                    el.classList.remove('selected');
                });

                // Mark as selected
                this.classList.add('selected');

                // Call the callback if defined
                if (typeof self.onFileSelected === 'function') {
                    self.onFileSelected(path);
                }

                // Auto-load after a short delay
                if (self.autoLoadEnabled) {
                    setTimeout(function() {
                        self.triggerAutoLoad();
                    }, 100);
                }
            });
        });
    }

    /**
     * Set up drag and drop functionality for file tree items
     */
    setupDragAndDrop() {
        // Make file items draggable
        document.querySelectorAll('.tree-file').forEach(fileItem => {
            fileItem.setAttribute('draggable', 'true');

            // Only add event listeners once
            if (!fileItem.hasAttribute('data-drag-initialized')) {
                fileItem.setAttribute('data-drag-initialized', 'true');

                fileItem.addEventListener('dragstart', function(e) {
                    const path = this.getAttribute('data-path');
                    console.log("Drag started:", path);
                    e.dataTransfer.setData('text/plain', path);
                    e.dataTransfer.effectAllowed = 'copy';
                });
            }
        });

        // Set up viewport drop zones if comparison view is available
        if (window.comparisonView) {
            this.setupViewportDropZones();
        }
    }

    /**
     * Set up drop zones for comparison view viewports
     */
    setupViewportDropZones() {
        document.querySelectorAll('.viewport-drop-zone').forEach((dropZone) => {
            // Remove any existing handlers to avoid duplicates
            const newDropZone = dropZone.cloneNode(true);
            if (dropZone.parentNode) {
                dropZone.parentNode.replaceChild(newDropZone, dropZone);
            }

            // Add new handlers
            newDropZone.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.add('dragover');
            });

            newDropZone.addEventListener('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.remove('dragover');
            });

            newDropZone.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.remove('dragover');

                const filePath = e.dataTransfer.getData('text/plain');
                console.log("File dropped:", filePath);

                if (filePath && window.comparisonView) {
                    // Get viewport index
                    const viewportIndex = parseInt(this.getAttribute('data-index'));
                    if (!isNaN(viewportIndex)) {
                        window.comparisonView.loadFileIntoViewport(filePath, viewportIndex);
                    }
                }
            });
        });
    }

    /**
     * Create HTML for a folder item in the file tree
     * @param {Object} folder - Folder object
     * @returns {string} HTML string
     */
    createFolderItem(folder) {
        const safePath = folder.path.replace(/[\/.]/g, '_');

        let html = `<div class="tree-item tree-folder" data-path="${folder.path}">${folder.name}</div>`;
        html += `<div id="children-${safePath}" class="tree-children">`;

        // Add subfolders first
        for (const child of folder.children) {
            if (child.isDir) {
                html += this.createFolderItem(child);
            }
        }

        // Then add files
        for (const child of folder.children) {
            if (!child.isDir) {
                html += this.createFileItem(child);
            }
        }

        html += '</div>';
        return html;
    }

    /**
     * Create HTML for a file item in the file tree
     * @param {Object} file - File object
     * @returns {string} HTML string
     */
    createFileItem(file) {
        // Add appropriate class for DICOM/image files
        const fileClass = file.isDicomOrImage ? 'tree-file image-file' : 'tree-file';

        return `<div class="tree-item ${fileClass}" data-path="${file.path}" draggable="true">${file.name}</div>`;
    }

    /**
     * Gets a file from the ZIP by path
     * @param {string} path - File path
     * @returns {Promise} - Resolves with file buffer
     */
    async getFile(path) {
        const entry = this.zipEntries[path];
        if (!entry) {
            throw new Error(`File not found: ${path}`);
        }

        // Get as ArrayBuffer
        return entry.async('arraybuffer');
    }
}

window.FileManager = FileManager;
