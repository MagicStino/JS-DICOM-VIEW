/**
 * UI Controller Module - Part 1
 * Handles user interface interactions and event handling
 */

function DicomViewer() {
    // Initialize core components
    this.fileManager = null;
    this.imageProcessor = null;
    this.hangingProtocols = null;
    this.seriesNavigator = null;

    // Current image data
    this.currentImageData = null;
    this.currentFilePath = null;

    // Current series
    this.currentSeries = [];

    // Flag to track if we've initialized the comparison view
    this.comparisonInitialized = false;
}

// Initialize components
DicomViewer.prototype.initialize = function() {
    console.log("Initializing DICOM Viewer...");

    // Initialize file manager
    this.fileManager = new FileManager();
    this.fileManager.setFileSelectedCallback(this.selectFile.bind(this));

    // Initialize image processor
    this.imageProcessor = new ImageProcessor();

    // Initialize metadata tab system
    this.initTabSystem();

    // Set up event listeners for UI controls
    this.setupEventListeners();

    // Initialize series navigator if available
    if (window.SeriesNavigator) {
        this.seriesNavigator = new SeriesNavigator();

        // Set up series navigation callback
        window.onSeriesNavigate = (imageData, index) => {
            if (imageData && imageData.canvas) {
                if (window.comparisonView && window.comparisonView.isVisible) {
                    // If comparison view is visible, load into the first viewport
                    window.comparisonView.displayImage(imageData, 0);
                } else {
                    this.imageProcessor.renderImage(imageData);
                }

                if (imageData.metadata) {
                    this.updateMetadataDisplay(imageData.metadata);
                    this.updatePatientInfoDisplay(imageData.metadata);
                }
            }
        };
    }

    // Initialize hanging protocols if available
    if (window.HangingProtocols) {
        this.hangingProtocols = new HangingProtocols();

        // Set up protocol application callback
        window.onApplyProtocol = (protocol) => {
            console.log("Protocol to be applied:", protocol);

            // Apply the protocol
            if (protocol.layout && window.comparisonView) {
                // Ensure comparison view is initialized and visible
                this.initComparisonView();
                window.comparisonView.show();

                // Set the layout
                window.comparisonView.setLayout(protocol.layout);
            }
        };
    }

    // Initialize comparison view if available - always initialize on startup
    if (window.ComparisonView) {
        this.initComparisonView();

        // Show comparison view by default, replacing the single image view
        if (window.comparisonView) {
            window.comparisonView.show();
        }
    }

    console.log("DICOM Viewer initialized");
};

// Initialize tab system
DicomViewer.prototype.initTabSystem = function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get target tab
            const targetId = button.getAttribute('data-tab');
            const targetTab = document.getElementById(targetId);

            if (!targetTab) return;

            // Remove active class from all buttons and tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            // Add active class to selected button and tab
            button.classList.add('active');
            targetTab.classList.add('active');
        });
    });
};

// Set up event listeners
DicomViewer.prototype.setupEventListeners = function() {
    // ZIP file input
    const zipFileInput = document.getElementById('zipFileInput');

    if (zipFileInput) {
        zipFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                
                // Check if it's a ZIP file or a DICOM file
                if (file.name.toLowerCase().endsWith('.zip')) {
                    this.loadZipFile(file);
                } else if (file.name.toLowerCase().endsWith('.dcm') || 
                           file.type === 'application/dicom') {
                    this.loadSingleDicomFile(file);
                } else {
                    document.getElementById('status').innerHTML = "Unsupported file type. Please select a DICOM file or ZIP file.";
                    document.getElementById('status').className = 'error';
                }
            }
        });
    }

    // Zoom controls
    const zoomInButton = document.getElementById('zoomInButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
    const bestFitButton = document.getElementById('bestFitButton');

    if (zoomInButton && zoomOutButton) {
        zoomInButton.addEventListener('click', () => {
            if (window.comparisonView && window.comparisonView.isVisible) {
                window.comparisonView.zoomSelectedViewports(0.1);
            } else {
                this.imageProcessor.adjustZoom(0.1);
            }
        });

        zoomOutButton.addEventListener('click', () => {
            if (window.comparisonView && window.comparisonView.isVisible) {
                window.comparisonView.zoomSelectedViewports(-0.1);
            } else {
                this.imageProcessor.adjustZoom(-0.1);
            }
        });
    }
    
    if (bestFitButton) {
        bestFitButton.addEventListener('click', () => {
            if (window.comparisonView && window.comparisonView.isVisible) {
                window.comparisonView.fitSelectedViewportsToContent();
            } else {
                // For single image view, implement best fit functionality
                this.imageProcessor.fitToContainer();
            }
        });
    }

    // Image container for zoom and pan
    const imageContainer = document.getElementById('imageContainer');
    if (imageContainer) {
        let isDragging = false;

        imageContainer.addEventListener('mousedown', (e) => {
            isDragging = this.imageProcessor.startDrag(e);
            if (isDragging) imageContainer.style.cursor = 'grabbing';
        });

        imageContainer.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.imageProcessor.drag(e);
            }
        });

        imageContainer.addEventListener('mouseup', () => {
            if (isDragging) {
                this.imageProcessor.endDrag();
                imageContainer.style.cursor = 'grab';
                isDragging = false;
            }
        });

        imageContainer.addEventListener('mouseleave', () => {
            if (isDragging) {
                this.imageProcessor.endDrag();
                imageContainer.style.cursor = 'grab';
                isDragging = false;
            }
        });

        // Mouse wheel for zoom
        imageContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            this.imageProcessor.adjustZoom(delta, e);
        });
    }

    // Image processing controls
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    const resetViewButton = document.getElementById('resetViewButton');
    const invertButton = document.getElementById('invertButton');
    const downloadButton = document.getElementById('downloadButton');

    if (brightnessSlider && contrastSlider) {
        brightnessSlider.addEventListener('input', () => {
            if (window.comparisonView && window.comparisonView.isVisible) {
                window.comparisonView.updateBrightnessForSelectedViewports(parseInt(brightnessSlider.value));
            } else {
                this.imageProcessor.updateFilters({
                    brightness: parseInt(brightnessSlider.value)
                });
            }
        });

        contrastSlider.addEventListener('input', () => {
            if (window.comparisonView && window.comparisonView.isVisible) {
                window.comparisonView.updateContrastForSelectedViewports(parseInt(contrastSlider.value));
            } else {
                this.imageProcessor.updateFilters({
                    contrast: parseInt(contrastSlider.value)
                });
            }
        });
    }

    if (resetViewButton) {
        resetViewButton.addEventListener('click', () => {
            // Reset brightness and contrast sliders
            if (brightnessSlider) brightnessSlider.value = 0;
            if (contrastSlider) contrastSlider.value = 0;

            // Reset the view
            if (window.comparisonView && window.comparisonView.isVisible) {
                window.comparisonView.resetViewportDisplay();
            } else {
                this.imageProcessor.resetView();
            }
        });
    }

    if (invertButton) {
        invertButton.addEventListener('click', () => {
            if (window.comparisonView && window.comparisonView.isVisible) {
                window.comparisonView.toggleInvertForSelectedViewports();
            } else {
                this.imageProcessor.toggleInvert();
            }
        });
    }

    if (downloadButton) {
        downloadButton.addEventListener('click', () => {
            if (window.comparisonView && window.comparisonView.isVisible) {
                // Get all viewports with images
                const viewportsWithImages = window.comparisonView.viewports
                    .map((viewport, index) => ({ viewport, index }))
                    .filter(item => item.viewport.hasImage);
                
                // If there are selected viewports, prioritize those
                const selectedViewportsWithImages = viewportsWithImages
                    .filter(item => window.comparisonView.selectedViewports.includes(item.index));
                
                // Determine which viewports to download
                const viewportsToDownload = selectedViewportsWithImages.length > 0 ? 
                    selectedViewportsWithImages : viewportsWithImages;
                
                // Download all images
                if (viewportsToDownload.length > 0) {
                    // Use a small delay between downloads to prevent browser issues
                    viewportsToDownload.forEach((item, i) => {
                        setTimeout(() => {
                            window.comparisonView.downloadViewportImage(item.index);
                        }, i * 300); // 300ms delay between downloads
                    });
                }
            } else {
                this.imageProcessor.downloadImage();
            }
        });
    }
};

// Load a ZIP file
DicomViewer.prototype.loadZipFile = async function(file) {
    try {
        // Show loading status
        document.getElementById('status').innerHTML =
            `<div><span class="spinner"></span> Loading ${file.name}...</div>`;
        document.getElementById('status').className = 'processing';

        // Load ZIP with file manager
        await this.fileManager.loadZipFile(file);

        // Show success status
        document.getElementById('status').innerHTML = `Successfully loaded ${file.name}`;
        document.getElementById('status').className = 'success';

        // Show the file tree when a ZIP file is loaded
        const fileTree = document.getElementById('fileTree');
        if (fileTree) {
            fileTree.classList.add('visible');
        }

        // Look for DICOMDIR
        this.checkForDicomdir();

    } catch (error) {
        console.error("Error loading ZIP:", error);
        document.getElementById('status').innerHTML = `Error loading ZIP: ${error.message}`;
        document.getElementById('status').className = 'error';
    }
};

// Check for DICOMDIR file
DicomViewer.prototype.checkForDicomdir = async function() {
    try {
        // Try to find DICOMDIR in the root or common locations
        const possiblePaths = ['DICOMDIR', 'dicomdir', 'DICOM/DICOMDIR'];

        for (const path of possiblePaths) {
            try {
                const buffer = await this.fileManager.getFile(path);
                if (buffer) {
                    console.log("Found DICOMDIR file at", path);

                    // Parse DICOMDIR
                    const dicomdirParser = new DicomdirParser();
                    const dicomdirData = dicomdirParser.parseDicomdir(buffer);

                    // Make it available globally
                    window.dicomdirParser = dicomdirParser;

                    // Update UI with DICOMDIR information
                    this.updateDicomdirDisplay(dicomdirData);

                    // Switch to DICOMDIR tab
                    document.querySelector('.tab-button[data-tab="dicomdir-tab"]').click();

                    return;
                }
            } catch (e) {
                // Continue to next path
            }
        }

        console.log("No DICOMDIR file found");

    } catch (error) {
        console.error("Error checking for DICOMDIR:", error);
    }
};

// Handle file selection
DicomViewer.prototype.selectFile = function(filePath) {
    this.currentFilePath = filePath;
    console.log("File selected:", filePath);
    
    // If comparison view is available, load the file into the next free viewport
    if (window.comparisonView) {
        const freeViewportIndex = window.comparisonView.getNextFreeViewportIndex();
        console.log("Free viewport index:", freeViewportIndex);
        console.log("Selected viewports:", window.comparisonView.selectedViewports);
        console.log("Viewport states:", window.comparisonView.viewports.map(v => v.hasImage));
        
        if (freeViewportIndex >= 0) {
            // Load into free viewport
            console.log("Loading into free viewport:", freeViewportIndex);
            this.loadFileIntoComparisonViewport(filePath, freeViewportIndex);
        } else if (window.comparisonView.selectedViewports.length === 1) {
            // Load into selected viewport
            const viewportIndex = window.comparisonView.selectedViewports[0];
            console.log("Loading into selected viewport:", viewportIndex);
            this.loadFileIntoComparisonViewport(filePath, viewportIndex);
        } else if (window.comparisonView.selectedViewports.length > 1) {
            // Multiple viewports selected - notify user to select only one
            document.getElementById('status').innerHTML =
                `Please select only one grid cell to load this image, or deselect all to load into the next available cell.`;
            document.getElementById('status').className = 'warning';
            // Don't attempt to load the file
            return;
        } else {
            // No free viewports - ask user to select one first
            document.getElementById('status').innerHTML =
                `All grid cells are full. Please select one grid cell to replace its content with this image.`;
            document.getElementById('status').className = 'warning';
            // Don't attempt to load the file
            return;
        }
    } else {
        // Fall back to regular loading if comparison view is not available
        this.loadDicomFile(filePath);
    }
};

// Load and display a DICOM file
DicomViewer.prototype.loadDicomFile = async function(filePath) {
    if (!filePath) return;

    try {
        // Show loading status
        document.getElementById('status').innerHTML =
            `<div><span class="spinner"></span> Loading ${filePath}...</div>`;
        document.getElementById('status').className = 'processing';

        // Get file data from ZIP
        const fileBuffer = await this.fileManager.getFile(filePath);

        // Parse DICOM data
        const dicomData = DicomParser.parseDICOMFile(fileBuffer);

        if (!dicomData) {
            throw new Error("Failed to parse DICOM file");
        }

        // Extract and process pixel data
        const imageData = DicomParser.extractPixelData(dicomData);

        let loadSuccess = false;

        // Check if comparison view is visible and use it
        if (window.comparisonView && window.comparisonView.isVisible) {
            console.log("Loading into comparison view");

            // Check how many viewports are selected
            if (window.comparisonView.selectedViewports.length > 1) {
                // Multiple viewports selected - notify user to select only one
                document.getElementById('status').innerHTML =
                    `Please select only one grid cell to load this image, or deselect all to load into the next available cell.`;
                document.getElementById('status').className = 'warning';
                return;
            } else if (window.comparisonView.selectedViewports.length === 1) {
                // One viewport selected - load into it
                const viewportIndex = window.comparisonView.selectedViewports[0];
                console.log("Loading into selected viewport", viewportIndex);
                window.comparisonView.displayImage(imageData, viewportIndex);
                loadSuccess = true;
            } else {
                // Find the next free viewport or ask user to select one
                const freeViewportIndex = window.comparisonView.getNextFreeViewportIndex();

                if (freeViewportIndex >= 0) {
                    console.log("Loading into free viewport", freeViewportIndex);
                    window.comparisonView.displayImage(imageData, freeViewportIndex);
                    loadSuccess = true;
                } else {
                    // No free viewports - ask user to select one first
                    document.getElementById('status').innerHTML =
                        `All grid cells are full. Please select one grid cell to replace its content with this image.`;
                    document.getElementById('status').className = 'warning';
                    return;
                }
            }
        }

        // If loading into comparison view failed or comparison view is not visible, fall back to main canvas
        if (!loadSuccess) {
            console.log("Falling back to main canvas");
            this.displayDicomFile(imageData);
        }

        // Update metadata panels regardless of display method
        if (imageData.metadata) {
            this.updateMetadataDisplay(imageData.metadata);
            this.updatePatientInfoDisplay(imageData.metadata);
        }

        // Add to series if DICOMDIR info is available
        if (window.dicomdirParser) {
            const metadata = window.dicomdirParser.getMetadataForFile(filePath);
            if (metadata) {
                console.log("Found DICOMDIR metadata for", filePath, metadata);
            }
        }

        // Show success status
        if(loadSuccess) {
            document.getElementById('status').innerHTML = `Successfully loaded ${filePath}`;
            document.getElementById('status').className = 'success';
        }

    } catch (error) {
        console.error("Error loading DICOM file:", error);
        document.getElementById('status').innerHTML = `Error loading file: ${error.message}`;
        document.getElementById('status').className = 'error';
    }
};

// Display a DICOM file
DicomViewer.prototype.displayDicomFile = function(imageData) {
    if (!imageData) return;

    // Store the current image data
    this.currentImageData = imageData;

    // Display the image
    this.imageProcessor.renderImage(imageData);

    // Update metadata display
    if (imageData.metadata) {
        this.updateMetadataDisplay(imageData.metadata);
        this.updatePatientInfoDisplay(imageData.metadata);
    }

    // Update documents display if available
    if (imageData.documents && imageData.documents.length > 0) {
        this.displayDocuments(imageData.documents);
    }
};

// Initialize comparison view
DicomViewer.prototype.initComparisonView = function() {
    // Check if comparison view is already initialized
    if (this.comparisonInitialized) return;

    // Create comparison view
    if (!window.comparisonView && window.ComparisonView) {
        window.comparisonView = new ComparisonView();
        this.comparisonInitialized = true;
    }

    // Set up callbacks for comparison view
    if (window.comparisonView && typeof window.comparisonView.setupCallbacks === 'function') {
        window.comparisonView.setupCallbacks();
    }
};

// Load a single DICOM file
DicomViewer.prototype.loadSingleDicomFile = async function(file) {
    try {
        // Show loading status
        document.getElementById('status').innerHTML =
            `<div><span class="spinner"></span> Loading ${file.name}...</div>`;
        document.getElementById('status').className = 'processing';

        // Hide the file tree when loading a single DICOM file
        const fileTree = document.getElementById('fileTree');
        if (fileTree) {
            fileTree.classList.remove('visible');
        }

        // Read the file as an ArrayBuffer
        const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });

        // Parse DICOM file
        const dicomData = DicomParser.parseDICOMFile(arrayBuffer);
        if (!dicomData) {
            throw new Error('Failed to parse DICOM file');
        }
        
        const imageData = DicomParser.extractPixelData(dicomData);
        if (!imageData) {
            throw new Error('Failed to extract pixel data from DICOM file');
        }

        // Add filename to metadata
        if (imageData.metadata) {
            imageData.metadata.Filename = file.name;
        }

        // Show success status
        document.getElementById('status').innerHTML = `Successfully loaded ${file.name}`;
        document.getElementById('status').className = 'success';

        // Always load DCM files into the comparison view
        if (window.comparisonView) {
            // If we're in 1x1 layout, always load into the first viewport
            if (window.comparisonView.currentLayout === '1x1') {
                // Always override the current image in 1x1 layout
                window.comparisonView.displayImage(imageData, 0);
            } else {
                // In multi-grid layout, follow the standard selection rules
                const selectedViewports = window.comparisonView.selectedViewports;
                
                if (selectedViewports.length === 1) {
                    // Load into the selected viewport
                    const viewportIndex = selectedViewports[0];
                    window.comparisonView.displayImage(imageData, viewportIndex);
                } else {
                    // Find the next free viewport
                    const freeViewportIndex = window.comparisonView.getNextFreeViewportIndex();
                    
                    if (freeViewportIndex >= 0) {
                        // Load into free viewport
                        window.comparisonView.displayImage(imageData, freeViewportIndex);
                    } else if (selectedViewports.length > 1) {
                        // Multiple viewports selected - notify user to select only one
                        document.getElementById('status').innerHTML =
                            `Please select only one grid cell to load this image, or deselect all to load into the next available cell.`;
                        document.getElementById('status').className = 'warning';
                    } else {
                        // No free viewports - ask user to select one first
                        document.getElementById('status').innerHTML =
                            `All grid cells are full. Please select one grid cell to replace its content with this image.`;
                        document.getElementById('status').className = 'warning';
                    }
                }
            }
            
            // Update metadata panels
            if (imageData.metadata) {
                this.updateMetadataDisplay(imageData.metadata);
                this.updatePatientInfoDisplay(imageData.metadata);
            }
        } else {
            // Update the UI with the loaded image data
            this.updateImageDisplay(imageData);
            
            // Update metadata display
            if (imageData.metadata) {
                this.updateMetadataDisplay(imageData.metadata);
            }
        }

    } catch (error) {
        console.error("Error loading DICOM file:", error);
        document.getElementById('status').innerHTML = `Error loading DICOM file: ${error.message}`;
        document.getElementById('status').className = 'error';
    }
};
