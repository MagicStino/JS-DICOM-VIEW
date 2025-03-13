/**
 * Comparison View Module - Part 1
 * Core functionality and initialization
 */

function ComparisonView() {
    // Container element
    this.container = null;

    // Active viewports
    this.viewports = [];

    // Maximum number of viewports
    this.maxViewports = 4;

    // Layout settings
    this.currentLayout = '1x1';
    this.layouts = {
        '1x1': { rows: 1, cols: 1 },
        '1x2': { rows: 1, cols: 2 },
        '2x1': { rows: 2, cols: 1 },
        '2x2': { rows: 2, cols: 2 }
    };

    // Visibility state
    this.isVisible = false;
    this.isFullscreen = false;

    // Track selected viewports
    this.selectedViewports = [];

    // Initialize component
    this.initialize();
}

// Initialize comparison view
ComparisonView.prototype.initialize = function() {
    // Create container element
    this.container = document.createElement('div');
    this.container.className = 'comparison-container';
    this.container.style.display = 'none';

    // No main control bar - using existing viewer controls

    // Create comparison view toolbar (simplified)
    const toolbar = document.createElement('div');
    toolbar.className = 'comparison-toolbar';

    // Add layout buttons
    const layoutSelector = document.createElement('div');
    layoutSelector.className = 'layout-selector';
    layoutSelector.innerHTML = `
        <span>Grid Layout:</span>
        <button data-layout="1x1" class="active">1x1</button>
        <button data-layout="1x2">1x2</button>
        <button data-layout="2x1">2x1</button>
        <button data-layout="2x2">2x2</button>
    `;

    // Add viewport selection option
    const selectionOptions = document.createElement('div');
    selectionOptions.className = 'selection-options';
    selectionOptions.innerHTML = `
        <button id="select-all">Select All</button>
        <button id="deselect-all">Deselect All</button>
    `;
    
    // Add fullscreen button
    const fullscreenButton = document.createElement('div');
    fullscreenButton.className = 'fullscreen-button';
    fullscreenButton.innerHTML = `
        <button id="toggle-fullscreen" title="Toggle Fullscreen">⛶</button>
    `;

    // Assemble toolbar (simplified)
    toolbar.appendChild(layoutSelector);
    toolbar.appendChild(selectionOptions);
    toolbar.appendChild(fullscreenButton);

    // Create viewport container
    const viewportContainer = document.createElement('div');
    viewportContainer.className = 'viewport-container';
    viewportContainer.id = 'viewport-container';

    // Create fullscreen overlay controls
    const fullscreenOverlayControls = document.createElement('div');
    fullscreenOverlayControls.className = 'fullscreen-overlay-controls';
    fullscreenOverlayControls.innerHTML = `
        <div class="control-group">
            <button id="fs-zoom-in" title="Zoom In">🔍+</button>
            <button id="fs-zoom-out" title="Zoom Out">🔍-</button>
            <button id="fs-best-fit" title="Best Fit Selected Images">Best Fit</button>
        </div>
        <div class="control-group slider-group">
            <div class="slider-control">
                <label>Brightness:</label>
                <input type="range" id="fs-brightness-slider" min="-100" max="100" value="0" class="compact-slider">
            </div>
            <div class="slider-control">
                <label>Contrast:</label>
                <input type="range" id="fs-contrast-slider" min="-100" max="100" value="0" class="compact-slider">
            </div>
        </div>
        <div class="control-group">
            <button id="fs-invert" title="Invert Colors">Invert</button>
        </div>
    `;

    // Create exit fullscreen button
    const exitFullscreenButton = document.createElement('button');
    exitFullscreenButton.className = 'exit-fullscreen-button';
    exitFullscreenButton.id = 'exit-fullscreen';
    exitFullscreenButton.textContent = 'Exit Fullscreen';
    exitFullscreenButton.title = 'Exit Fullscreen Mode';

    // Add to container
    this.container.appendChild(toolbar);
    this.container.appendChild(viewportContainer);
    this.container.appendChild(fullscreenOverlayControls);
    this.container.appendChild(exitFullscreenButton);

    // Add to document - insert before patient info to keep patient info below grid view
    const viewerArea = document.querySelector('.viewer-area');
    viewerArea.insertBefore(this.container, document.querySelector('.patient-info'));

    // Set up event listeners
    this.setupEventListeners();

    // Initialize with 1x1 layout
    this.setLayout('1x1');
};

// Set up event listeners
ComparisonView.prototype.setupEventListeners = function() {
    // Layout selector
    const layoutButtons = this.container.querySelectorAll('.layout-selector button');
    layoutButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            layoutButtons.forEach(b => b.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Set layout
            const layout = button.getAttribute('data-layout');
            this.setLayout(layout);
        });
    });

    // Select/Deselect All buttons
    const selectAllButton = this.container.querySelector('#select-all');
    const deselectAllButton = this.container.querySelector('#deselect-all');

    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => {
            this.selectAllViewports();
        });
    }

    if (deselectAllButton) {
        deselectAllButton.addEventListener('click', () => {
            this.deselectAllViewports();
        });
    }

    // Fullscreen toggle button
    const fullscreenButton = this.container.querySelector('#toggle-fullscreen');
    if (fullscreenButton) {
        fullscreenButton.addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }
    
    // No main control bar event listeners needed - using existing viewer controls

    // Exit fullscreen button
    const exitFullscreenButton = this.container.querySelector('#exit-fullscreen');
    if (exitFullscreenButton) {
        exitFullscreenButton.addEventListener('click', () => {
            this.exitFullscreen();
        });
    }

    // Fullscreen overlay controls
    const fsZoomInButton = this.container.querySelector('#fs-zoom-in');
    const fsZoomOutButton = this.container.querySelector('#fs-zoom-out');
    const fsBrightnessSlider = this.container.querySelector('#fs-brightness-slider');
    const fsContrastSlider = this.container.querySelector('#fs-contrast-slider');
    const fsInvertButton = this.container.querySelector('#fs-invert');
    const fsBestFitButton = this.container.querySelector('#fs-best-fit');

    if (fsZoomInButton) {
        fsZoomInButton.addEventListener('click', () => {
            this.zoomSelectedViewports(0.1);
        });
    }

    if (fsZoomOutButton) {
        fsZoomOutButton.addEventListener('click', () => {
            this.zoomSelectedViewports(-0.1);
        });
    }

    if (fsBestFitButton) {
        fsBestFitButton.addEventListener('click', () => {
            this.fitSelectedViewportsToContent();
        });
    }

    if (fsBrightnessSlider) {
        fsBrightnessSlider.addEventListener('input', (e) => {
            this.updateBrightnessForSelectedViewports(parseInt(e.target.value));
        });
    }

    if (fsContrastSlider) {
        fsContrastSlider.addEventListener('input', (e) => {
            this.updateContrastForSelectedViewports(parseInt(e.target.value));
        });
    }

    if (fsInvertButton) {
        fsInvertButton.addEventListener('click', () => {
            this.toggleInvertForSelectedViewports();
        });
    }

    // Set up drag and drop for external files
    const viewportContainer = document.getElementById('viewport-container');
    if (viewportContainer) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            viewportContainer.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            viewportContainer.addEventListener(eventName, () => {
                viewportContainer.classList.add('highlight-drop');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            viewportContainer.addEventListener(eventName, () => {
                viewportContainer.classList.remove('highlight-drop');
            }, false);
        });

        // Handle dropped files
        viewportContainer.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                // Get the viewport element that was dropped on
                let targetViewport = null;
                let targetViewportIndex = -1;
                
                // Find which viewport was the target
                for (let i = 0; i < this.viewports.length; i++) {
                    const viewport = this.viewports[i];
                    if (viewport.element.contains(e.target)) {
                        targetViewport = viewport;
                        targetViewportIndex = i;
                        break;
                    }
                }
                
                // If we found a target viewport, load the file into it
                if (targetViewportIndex >= 0) {
                    const file = files[0];
                    this.handleDroppedFile(file, targetViewportIndex);
                }
            }
        }, false);
    }

    // Set up keyboard events for the whole viewer area
    document.addEventListener('keydown', (e) => {
        // Ctrl+A to select all viewports
        if (e.ctrlKey && e.key === 'a' && this.isVisible) {
            e.preventDefault();
            this.selectAllViewports();
        }

        // Escape to deselect all viewports or exit fullscreen
        if (e.key === 'Escape' && this.isVisible) {
            if (this.isFullscreen) {
                this.exitFullscreen();
            } else {
                this.deselectAllViewports();
            }
        }
    });
};

// Handle dropped file
ComparisonView.prototype.handleDroppedFile = async function(file, viewportIndex) {
    try {
        // Show loading status
        document.getElementById('status').innerHTML =
            `<div><span class="spinner"></span> Loading ${file.name}...</div>`;
        document.getElementById('status').className = 'processing';

        // Check if it's a DICOM file
        if (file.name.toLowerCase().endsWith('.dcm') || 
            file.type === 'application/dicom') {
            
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

            // Load the image into the viewport using the displayImage function
            this.displayImage(imageData, viewportIndex);

            // Show success status
            document.getElementById('status').innerHTML = `Successfully loaded ${file.name}`;
            document.getElementById('status').className = 'success';
            
            // Update metadata panels if the viewer is available
            if (window.viewer && imageData.metadata) {
                window.viewer.updateMetadataDisplay(imageData.metadata);
                if (window.viewer.updatePatientInfoDisplay) {
                    window.viewer.updatePatientInfoDisplay(imageData.metadata);
                }
            }
        } else {
            document.getElementById('status').innerHTML = "Unsupported file type. Please drag a DICOM file.";
            document.getElementById('status').className = 'error';
        }
    } catch (error) {
        console.error("Error loading dropped file:", error);
        document.getElementById('status').innerHTML = `Error loading file: ${error.message}`;
        document.getElementById('status').className = 'error';
    }
};

// Setup drag events for image panning
ComparisonView.prototype.setupDragEvents = function() {
    const viewportContainer = this.container.querySelector('.viewport-container');
    
    // Track drag state
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let draggedViewportIndex = -1;
    
    viewportContainer.addEventListener('mousedown', (e) => {
        // Find which viewport was clicked
        const viewport = e.target.closest('.viewport');
        if (!viewport) return;
        
        const index = parseInt(viewport.getAttribute('data-index'));
        if (isNaN(index) || !this.viewports[index] || !this.viewports[index].hasImage) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        // Store the initial pan offset values
        startPanX = this.viewports[index].panOffsetX;
        startPanY = this.viewports[index].panOffsetY;
        
        draggedViewportIndex = index;
        
        // Prevent default behavior
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || draggedViewportIndex === -1) return;
        
        // Calculate the exact movement of the mouse
        const moveX = e.clientX - startX;
        const moveY = e.clientY - startY;
        
        // Update the pan offset for the viewport to match mouse movement exactly
        // This makes the image stick to the mouse cursor
        const viewport = this.viewports[draggedViewportIndex];
        viewport.panOffsetX = startPanX + moveX;
        viewport.panOffsetY = startPanY + moveY;
        
        // Update the canvas position
        this.updateCanvasPosition(draggedViewportIndex);
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        draggedViewportIndex = -1;
    });
    
    document.addEventListener('mouseleave', () => {
        isDragging = false;
        draggedViewportIndex = -1;
    });
};

// Reset display properties for selected viewports
ComparisonView.prototype.resetDisplayForSelectedViewports = function() {
    const viewportsToReset = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);

    viewportsToReset.forEach(index => {
        const viewport = this.viewports[index];
        if (!viewport || !viewport.hasImage) return;
        
        viewport.zoomLevel = 1;
        viewport.panOffsetX = 0;
        viewport.panOffsetY = 0;
        viewport.brightness = 0;
        viewport.contrast = 0;
        viewport.inverted = false;
        
        this.updateCanvasPosition(index);
        this.drawImageOnCanvas(index);
    });
};

// Fit selected viewports to content
ComparisonView.prototype.fitSelectedViewportsToContent = function() {
    const viewportsToUpdate = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);

    viewportsToUpdate.forEach(index => {
        this.fitImageToViewport(index);
    });
};

// Fit image to viewport
ComparisonView.prototype.fitImageToViewport = function(index) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;

    const canvas = viewport.canvas;
    const img = viewport.image;
    
    // Calculate the scale needed to fit the image in the viewport
    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;
    
    const scaleX = containerWidth / img.width;
    const scaleY = containerHeight / img.height;
    
    // Use the smaller scale to ensure the entire image fits
    const scale = Math.min(scaleX, scaleY);
    
    // Update viewport properties
    viewport.zoomLevel = scale;
    viewport.panOffsetX = (containerWidth - (img.width * scale)) / 2;
    viewport.panOffsetY = (containerHeight - (img.height * scale)) / 2;
    
    // Update canvas
    this.updateCanvasPosition(index);
};

// Toggle fullscreen mode
ComparisonView.prototype.toggleFullscreen = function() {
    // Toggle fullscreen state first to get accurate container dimensions after the change
    if (this.isFullscreen) {
        this.exitFullscreen();
    } else {
        this.enterFullscreen();
    }
    
    // Add a small delay to ensure the DOM has updated with new dimensions
    setTimeout(() => {
        // Process each viewport
        this.viewports.forEach((viewport, index) => {
            if (!viewport || !viewport.hasImage) return;
            
            // Get the container dimensions after the toggle
            const canvas = viewport.canvas;
            const container = canvas.parentElement;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // Calculate best fit zoom based on vertical dimension
            const verticalRatio = containerHeight / canvas.height;
            const bestFitZoom = verticalRatio * 0.8; // 80% of perfect fit for some margin
            
            // Set the zoom level
            viewport.zoomLevel = bestFitZoom;
            
            // Calculate the scaled image dimensions
            const scaledImageWidth = canvas.width * viewport.zoomLevel;
            const scaledImageHeight = canvas.height * viewport.zoomLevel;
            
            // Center the image in the container
            viewport.panOffsetX = (containerWidth - scaledImageWidth) / 2;
            viewport.panOffsetY = (containerHeight - scaledImageHeight) / 2;
            
            // Update canvas position
            this.updateCanvasPosition(index);
        });
    }, 50); // 50ms delay should be enough for the DOM to update
};

// Ensure the image is visible within the viewport
ComparisonView.prototype.ensureImageVisible = function(index, containerWidth, containerHeight, scaledImageWidth, scaledImageHeight) {
    const viewport = this.viewports[index];
    if (!viewport) return;
    
    // Calculate the minimum visible portion (at least 30% of the image should be visible)
    const minVisibleWidth = scaledImageWidth * 0.3;
    const minVisibleHeight = scaledImageHeight * 0.3;
    
    // Ensure image is not too far to the left
    if (viewport.panOffsetX + scaledImageWidth < minVisibleWidth) {
        viewport.panOffsetX = minVisibleWidth - scaledImageWidth;
    }
    
    // Ensure image is not too far to the right
    if (viewport.panOffsetX > containerWidth - minVisibleWidth) {
        viewport.panOffsetX = containerWidth - minVisibleWidth;
    }
    
    // Ensure image is not too far up
    if (viewport.panOffsetY + scaledImageHeight < minVisibleHeight) {
        viewport.panOffsetY = minVisibleHeight - scaledImageHeight;
    }
    
    // Ensure image is not too far down
    if (viewport.panOffsetY > containerHeight - minVisibleHeight) {
        viewport.panOffsetY = containerHeight - minVisibleHeight;
    }
};

// Enter fullscreen mode
ComparisonView.prototype.enterFullscreen = function() {
    if (this.isFullscreen) return;
    
    // Add fullscreen class to container
    this.container.classList.add('fullscreen');
    
    // Update state
    this.isFullscreen = true;
    
    // Sync overlay controls with main controls
    this.syncOverlayControlsWithMainControls();
    
    // Prevent scrolling on body
    document.body.style.overflow = 'hidden';
};

// Exit fullscreen mode
ComparisonView.prototype.exitFullscreen = function() {
    if (!this.isFullscreen) return;
    
    // Remove fullscreen class from container
    this.container.classList.remove('fullscreen');
    
    // Update state
    this.isFullscreen = false;
    
    // Restore scrolling on body
    document.body.style.overflow = '';
    
    // Add a small delay to ensure the DOM has updated with new dimensions
    setTimeout(() => {
        // Ensure each viewport is properly fitted to its container
        this.viewports.forEach((viewport, index) => {
            if (viewport.hasImage) {
                this.fitImageToViewport(index);
            }
        });
    }, 300); // Increased delay to ensure DOM has fully updated
};

// Sync overlay controls with main controls
ComparisonView.prototype.syncOverlayControlsWithMainControls = function() {
    // Get main controls
    const brightnessSlider = document.querySelector('#brightnessSlider');
    const contrastSlider = document.querySelector('#contrastSlider');
    
    // Get fullscreen controls
    const fsBrightnessSlider = this.container.querySelector('#fs-brightness-slider');
    const fsContrastSlider = this.container.querySelector('#fs-contrast-slider');
    
    // Sync values
    if (brightnessSlider && fsBrightnessSlider) {
        fsBrightnessSlider.value = brightnessSlider.value;
    }
    
    if (contrastSlider && fsContrastSlider) {
        fsContrastSlider.value = contrastSlider.value;
    }
};

// Update the visibility of the Clear All button based on loaded images
ComparisonView.prototype.updateClearAllButtonVisibility = function() {
    const hasLoadedImages = this.viewports.some(viewport => viewport.hasImage);
    const clearAllButton = this.container.querySelector('#clear-all-comparison');
    
    if (clearAllButton) {
        clearAllButton.style.display = hasLoadedImages ? 'inline-block' : 'none';
    }
};

// Load image into viewport
ComparisonView.prototype.loadImageIntoViewport = function(imageData, index) {
    // Create image object
    const img = new Image();
    img.onload = () => {
        // Get viewport at specified index
        const viewport = this.viewports[index];
        if (!viewport) return;

        // Store image in viewport
        viewport.image = img;
        viewport.hasImage = true;
        viewport.zoomLevel = 1;
        viewport.panOffsetX = 0;
        viewport.panOffsetY = 0;
        viewport.brightness = 0;
        viewport.contrast = 0;
        viewport.inverted = false;

        // Draw image on canvas
        this.drawImageOnCanvas(index);
        
        // Fit image to viewport
        this.fitImageToViewport(index);
        
        // Update Clear All button visibility
        this.updateClearAllButtonVisibility();
    };

    // Set image source
    img.src = imageData;
};

// Clear a specific viewport
ComparisonView.prototype.clearViewport = function(index) {
    const viewport = this.viewports[index];
    if (!viewport) return;

    // Clear canvas
    const canvas = viewport.canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reset viewport properties
    viewport.image = null;
    viewport.hasImage = false;
    viewport.zoomLevel = 1;
    viewport.panOffsetX = 0;
    viewport.panOffsetY = 0;
    viewport.brightness = 0;
    viewport.contrast = 0;
    viewport.inverted = false;

    // Remove selection
    if (viewport.selected) {
        viewport.selected = false;
        viewport.element.classList.remove('selected');
        
        // Remove from selected viewports array
        const selIndex = this.selectedViewports.indexOf(index);
        if (selIndex !== -1) {
            this.selectedViewports.splice(selIndex, 1);
        }
    }
    
    // Update Clear All button visibility
    this.updateClearAllButtonVisibility();
};

// Show the comparison view - simplified to not toggle since it's the main view
ComparisonView.prototype.show = function() {
    // Hide single image view
    const imageContainer = document.querySelector('.image-container');
    if (imageContainer) imageContainer.style.display = 'none';

    // Make sure patient info and tabs are visible and in the right position
    const patientInfo = document.querySelector('#patientInfo');
    if (patientInfo) patientInfo.style.display = 'block';

    const tabContainer = document.querySelector('.tab-container');
    if (tabContainer) tabContainer.style.display = 'block';

    // Show comparison view
    this.container.style.display = 'block';
    this.isVisible = true;
    this.isFullscreen = false;

    // Set up drop zones
    this.setupDropZones();

    // Reset any sliders to match the current viewport settings
    this.resetControlsToViewportSettings();
};

// Get the index of the next free viewport
ComparisonView.prototype.getNextFreeViewportIndex = function() {
    // Get the current layout
    const layout = this.layouts[this.currentLayout];
    const { rows, cols } = layout;
    const totalViewports = rows * cols;
    
    console.log(`DEBUG: Checking for free viewports in ${this.currentLayout} layout (${rows}x${cols})`);
    console.log(`DEBUG: Total viewports available: ${this.viewports.length}`);
    
    // Debug: Log the status of all viewports
    this.viewports.forEach((viewport, idx) => {
        console.log(`DEBUG: Viewport ${idx}: hasImage=${viewport.hasImage}, row=${viewport.row || 'undefined'}, col=${viewport.col || 'undefined'}`);
    });
    
    // Check each viewport in order (left to right, top to bottom)
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            console.log(`DEBUG: Checking viewport at index ${index}, row=${row}, col=${col}`);
            
            // Make sure we don't go beyond the available viewports
            if (index < this.viewports.length) {
                // Check if this viewport is free
                if (!this.viewports[index].hasImage) {
                    console.log(`DEBUG: Found free viewport at index ${index} (row ${row}, col ${col})`);
                    return index;
                } else {
                    console.log(`DEBUG: Viewport ${index} is occupied`);
                }
            } else {
                console.log(`DEBUG: Index ${index} is beyond available viewports`);
            }
        }
    }
    
    // If we get here, no free viewports were found
    console.log("DEBUG: No free viewports found");
    return -1;
};

// Reset all viewports and clear them
ComparisonView.prototype.resetAllViewports = function() {
    this.viewports.forEach((viewport, index) => {
        this.clearViewport(index);
    });

    // Reset brightness and contrast controls
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');

    if (brightnessSlider) brightnessSlider.value = 0;
    if (contrastSlider) contrastSlider.value = 0;
};

// Reset viewport display properties without removing the images
ComparisonView.prototype.resetViewportDisplay = function() {
    // Get viewports to update (either selected or all with images)
    const viewportsToUpdate = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);

    // Reset each viewport's display properties
    viewportsToUpdate.forEach(index => {
        const viewport = this.viewports[index];
        if (viewport && viewport.hasImage) {
            // Reset display settings but keep the image
            viewport.brightness = 0;
            viewport.contrast = 0;
            viewport.inverted = false;

            // Apply the changes
            this.applyFilters(index);

            // Reset zoom to best fit
            this.fitImageToViewport(index);
        }
    });

    // Reset control sliders
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');

    if (brightnessSlider) brightnessSlider.value = 0;
    if (contrastSlider) contrastSlider.value = 0;
};

// Download the image from a specific viewport
ComparisonView.prototype.downloadViewportImage = function(index) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;

    // Create a new canvas to apply the filters
    const canvas = document.createElement('canvas');
    canvas.width = viewport.canvas.width;
    canvas.height = viewport.canvas.height;
    const ctx = canvas.getContext('2d');

    // Apply filters if any
    let filterString = '';
    if (viewport.brightness !== 0) {
        filterString += ` brightness(${100 + viewport.brightness}%)`;
    }
    if (viewport.contrast !== 0) {
        const contrastValue = (viewport.contrast + 100) / 100;
        filterString += ` contrast(${contrastValue})`;
    }
    if (viewport.inverted) {
        filterString += ` invert(100%)`;
    }

    if (filterString) {
        ctx.filter = filterString.trim();
    }

    // Draw the image
    ctx.drawImage(viewport.canvas, 0, 0);

    // Generate a meaningful filename based on metadata
    let filename = 'dicom_image.png';
    
    if (viewport.imageData && viewport.imageData.metadata) {
        // Try to extract patient name, body part, and other identifiers
        const metadata = viewport.imageData.metadata;
        let patientName = metadata['0x00100010'] || '';
        let patientId = metadata['0x00100020'] || '';
        let bodyPartInfo = { part: '', laterality: '', description: '' };
        
        // Use MetadataOrganizer to identify body part if available
        if (window.MetadataOrganizer) {
            const organizer = new MetadataOrganizer();
            bodyPartInfo = organizer.identifyBodyPart(metadata);
        }
        
        // Clean up patient name for filename (remove special chars)
        patientName = patientName.replace(/[^a-zA-Z0-9]/g, '_').trim();
        
        // Build filename components
        const components = [];
        if (patientName) components.push(patientName);
        if (patientId) components.push(patientId);
        
        // Add body part description if available, otherwise use the identified part
        if (bodyPartInfo.description) {
            // Clean up description for filename (remove special chars)
            const cleanDescription = bodyPartInfo.description.replace(/[^a-zA-Z0-9]/g, '_').trim();
            if (cleanDescription) components.push(cleanDescription);
        } else if (bodyPartInfo.part && bodyPartInfo.part !== 'Unknown') {
            components.push(bodyPartInfo.part.replace(/\s+/g, '_'));
        }
        
        if (bodyPartInfo.laterality) components.push(bodyPartInfo.laterality);
        
        // Add viewport index for multiple images
        components.push(`view${index + 1}`);
        
        // Add date if available
        const studyDate = metadata['0x00080020'] || '';
        if (studyDate) components.push(studyDate);
        
        // Create filename
        if (components.length > 0) {
            filename = components.join('_') + '.png';
        }
    }

    // Create and trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// Setup drop zones for viewports
ComparisonView.prototype.setupDropZones = function() {
    // Set up drop zones for each viewport
    this.viewports.forEach((viewport, index) => {
        const dropZone = viewport.element.querySelector('.viewport-drop-zone');
        if (!dropZone) return;
        
        // Clear existing event listeners by cloning and replacing
        const newDropZone = dropZone.cloneNode(true);
        dropZone.parentNode.replaceChild(newDropZone, dropZone);
        
        // Add event listeners for drag and drop
        newDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            newDropZone.classList.add('drag-over');
        });
        
        newDropZone.addEventListener('dragleave', () => {
            newDropZone.classList.remove('drag-over');
        });
        
        newDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            newDropZone.classList.remove('drag-over');
            
            // Get file data from the drop event
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                // Process the first file
                const file = files[0];
                this.loadFileIntoViewport(file.path, index);
            }
        });
    });
};

// Reset controls to match viewport settings
ComparisonView.prototype.resetControlsToViewportSettings = function() {
    // Get the first selected viewport with an image, or the first viewport with an image
    let targetViewport = null;
    let targetIndex = -1;
    
    if (this.selectedViewports.length > 0) {
        for (const index of this.selectedViewports) {
            if (this.viewports[index] && this.viewports[index].hasImage) {
                targetViewport = this.viewports[index];
                targetIndex = index;
                break;
            }
        }
    }
    
    if (!targetViewport) {
        for (let i = 0; i < this.viewports.length; i++) {
            if (this.viewports[i] && this.viewports[i].hasImage) {
                targetViewport = this.viewports[i];
                targetIndex = i;
                break;
            }
        }
    }
    
    // If no viewport with an image was found, reset controls to default
    if (!targetViewport) {
        const brightnessSlider = document.getElementById('brightnessSlider');
        const contrastSlider = document.getElementById('contrastSlider');
        
        if (brightnessSlider) brightnessSlider.value = 0;
        if (contrastSlider) contrastSlider.value = 0;
        return;
    }
    
    // Update sliders to match the target viewport
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    
    if (brightnessSlider) brightnessSlider.value = targetViewport.brightness || 0;
    if (contrastSlider) contrastSlider.value = targetViewport.contrast || 0;
};

// Reset zoom for selected viewports
ComparisonView.prototype.resetZoomForSelectedViewports = function() {
    const viewportsToReset = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);

    viewportsToReset.forEach(index => {
        const viewport = this.viewports[index];
        if (!viewport || !viewport.hasImage) return;
        
        viewport.zoomLevel = 1;
        viewport.panOffsetX = 0;
        viewport.panOffsetY = 0;
        
        this.updateCanvasPosition(index);
    });
};

// Select all viewports
ComparisonView.prototype.selectAllViewports = function() {
    this.viewports.forEach((viewport, index) => {
        if (viewport.hasImage) {
            this.toggleViewportSelection(index, true);
        }
    });
};

// Deselect all viewports
ComparisonView.prototype.deselectAllViewports = function() {
    this.selectedViewports.forEach(index => {
        this.toggleViewportSelection(index, false);
    });
    this.selectedViewports = [];
};

// Toggle viewport selection
ComparisonView.prototype.toggleViewportSelection = function(index, forceSelect) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;
    
    const isSelected = typeof forceSelect !== 'undefined' ? forceSelect : !viewport.selected;
    
    // Update viewport selection state
    viewport.selected = isSelected;
    
    // Update selected viewports list
    const selIndex = this.selectedViewports.indexOf(index);
    if (isSelected && selIndex === -1) {
        this.selectedViewports.push(index);
    } else if (!isSelected && selIndex !== -1) {
        this.selectedViewports.splice(selIndex, 1);
    }
    
    // Update viewport visual selection state
    if (isSelected) {
        viewport.element.classList.add('selected');
        
        // Update brightness and contrast sliders to match the selected viewport
        this.updateSlidersToMatchViewport(viewport);
    } else {
        viewport.element.classList.remove('selected');
        
        // If this was the last selected viewport, reset sliders
        if (this.selectedViewports.length === 0) {
            this.resetSliders();
        } else if (this.selectedViewports.length > 0) {
            // Update sliders to match the first selected viewport
            const firstSelectedViewport = this.viewports[this.selectedViewports[0]];
            this.updateSlidersToMatchViewport(firstSelectedViewport);
        }
    }
};

// Update sliders to match viewport settings
ComparisonView.prototype.updateSlidersToMatchViewport = function(viewport) {
    if (!viewport) return;
    
    // Get main slider elements
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    
    // Get fullscreen slider elements
    const fsBrightnessSlider = document.querySelector('#fs-brightness-slider');
    const fsContrastSlider = document.querySelector('#fs-contrast-slider');
    
    // Update main sliders to match viewport settings
    if (brightnessSlider) brightnessSlider.value = viewport.brightness || 0;
    if (contrastSlider) contrastSlider.value = viewport.contrast || 0;
    
    // Update fullscreen sliders to match viewport settings
    if (fsBrightnessSlider) fsBrightnessSlider.value = viewport.brightness || 0;
    if (fsContrastSlider) fsContrastSlider.value = viewport.contrast || 0;
};

// Reset sliders to default values
ComparisonView.prototype.resetSliders = function() {
    // Get main slider elements
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    
    // Get fullscreen slider elements
    const fsBrightnessSlider = document.querySelector('#fs-brightness-slider');
    const fsContrastSlider = document.querySelector('#fs-contrast-slider');
    
    // Reset main sliders
    if (brightnessSlider) brightnessSlider.value = 0;
    if (contrastSlider) contrastSlider.value = 0;
    
    // Reset fullscreen sliders
    if (fsBrightnessSlider) fsBrightnessSlider.value = 0;
    if (fsContrastSlider) fsContrastSlider.value = 0;
};

// Zoom selected viewports
ComparisonView.prototype.zoomSelectedViewports = function(delta) {
    const viewportsToZoom = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);
    
    viewportsToZoom.forEach(index => {
        this.adjustZoom(delta, index);
    });
};

// Adjust zoom for a specific viewport
ComparisonView.prototype.adjustZoom = function(delta, index, event) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;
    
    // Calculate new zoom level
    const minZoom = 0.1;
    const maxZoom = 10;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, viewport.zoomLevel * (1 + delta)));
    
    // If zoom level didn't change significantly, don't update
    if (Math.abs(newZoom - viewport.zoomLevel) < 0.01) return;
    
    // Get the viewport element and canvas
    const viewportElement = document.querySelector(`.viewport[data-index="${index}"]`);
    if (!viewportElement) return;
    const canvas = viewport.canvas;
    if (!canvas) return;
    
    // Get the viewport dimensions
    const viewportRect = viewportElement.getBoundingClientRect();
    
    // Calculate mouse position relative to the viewport (not the canvas)
    let mouseX, mouseY;
    if (event) {
        // Get mouse position relative to the viewport
        mouseX = event.clientX - viewportRect.left;
        mouseY = event.clientY - viewportRect.top;
    } else {
        // If no event, use the center of the viewport
        mouseX = viewportRect.width / 2;
        mouseY = viewportRect.height / 2;
    }
    
    // Convert viewport coordinates to image coordinates
    // This is the crucial step - we need to account for current pan and zoom
    const imageX = (mouseX - viewport.panOffsetX) / viewport.zoomLevel;
    const imageY = (mouseY - viewport.panOffsetY) / viewport.zoomLevel;
    
    // Store old zoom for reference
    const oldZoom = viewport.zoomLevel;
    
    // Update zoom level
    viewport.zoomLevel = newZoom;
    
    // Calculate new pan offsets to keep the mouse point fixed on the same image point
    viewport.panOffsetX = mouseX - (imageX * newZoom);
    viewport.panOffsetY = mouseY - (imageY * newZoom);
    
    // Update canvas position
    this.updateCanvasPosition(index);
};

// Update canvas position based on zoom and pan
ComparisonView.prototype.updateCanvasPosition = function(index) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;
    
    const canvas = viewport.canvas;
    
    // Apply transform
    canvas.style.transform = `translate(${viewport.panOffsetX}px, ${viewport.panOffsetY}px) scale(${viewport.zoomLevel})`;
    
    // Update zoom percentage display if this is a selected viewport
    if (this.selectedViewports.includes(index)) {
        const zoomPercentage = document.getElementById('zoom-percentage');
        if (zoomPercentage) {
            zoomPercentage.textContent = `${Math.round(viewport.zoomLevel * 100)}%`;
        }
    }
};

// Draw image on canvas
ComparisonView.prototype.drawImageOnCanvas = function(index) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;
    
    const canvas = viewport.canvas;
    const ctx = canvas.getContext('2d');
    const img = viewport.image;
    
    // Set canvas dimensions to match image
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(img, 0, 0);
    
    // Apply filters
    this.applyFilters(index);
};

// Update brightness for selected viewports
ComparisonView.prototype.updateBrightnessForSelectedViewports = function(value) {
    const viewportsToUpdate = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);

    viewportsToUpdate.forEach(index => {
        const viewport = this.viewports[index];
        viewport.brightness = value;
        this.applyFilters(index);
    });

    // Update brightness slider to match
    const brightnessSlider = document.getElementById('brightnessSlider');
    if (brightnessSlider) {
        brightnessSlider.value = value;
    }
};

// Update contrast for selected viewports
ComparisonView.prototype.updateContrastForSelectedViewports = function(value) {
    const viewportsToUpdate = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);

    viewportsToUpdate.forEach(index => {
        const viewport = this.viewports[index];
        viewport.contrast = value;
        this.applyFilters(index);
    });

    // Update contrast slider to match
    const contrastSlider = document.getElementById('contrastSlider');
    if (contrastSlider) {
        contrastSlider.value = value;
    }
};

// Toggle invert for selected viewports
ComparisonView.prototype.toggleInvertForSelectedViewports = function() {
    const viewportsToUpdate = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);

    viewportsToUpdate.forEach(index => {
        const viewport = this.viewports[index];
        viewport.inverted = !viewport.inverted;
        this.applyFilters(index);
    });
};

// Apply image filters (brightness/contrast/invert)
ComparisonView.prototype.applyFilters = function(index) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;

    let filterString = '';

    // Brightness
    if (viewport.brightness !== 0) {
        filterString += ` brightness(${100 + viewport.brightness}%)`;
    }

    // Contrast
    if (viewport.contrast !== 0) {
        const contrastValue = (viewport.contrast + 100) / 100;
        filterString += ` contrast(${contrastValue})`;
    }

    // Invert
    if (viewport.inverted) {
        filterString += ` invert(100%)`;
    }

    viewport.canvas.style.filter = filterString.trim();
};
