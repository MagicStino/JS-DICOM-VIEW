/**
 * Comparison View Module - Part 4
 * Image loading and display
 */

// Load a file into a viewport
ComparisonView.prototype.loadFileIntoViewport = async function(filePath, viewportIndex) {
    console.log("Loading file into viewport:", filePath, viewportIndex);

    // Check if file manager is available from window or viewer
    const fileManager = window.fileManager || (window.viewer ? window.viewer.fileManager : null);
    if (!fileManager) {
        console.error("No file manager available");
        return;
    }

    try {
        // Show loading status
        if (document.getElementById('status')) {
            document.getElementById('status').innerHTML =
                `<div><span class="spinner"></span> Loading ${filePath}...</div>`;
            document.getElementById('status').className = 'processing';
        }

        // Get file buffer
        const fileBuffer = await fileManager.getFile(filePath);

        // Parse DICOM data
        const dicomData = DicomParser.parseDICOMFile(fileBuffer);
        if (!dicomData) {
            throw new Error("Failed to parse DICOM file");
        }

        // Extract pixel data
        const imageData = DicomParser.extractPixelData(dicomData);

        // Clear the viewport first to reset all settings (ensures we can reload images in the same viewport)
        this.clearViewport(viewportIndex);

        // Display in viewport
        this.displayImage(imageData, viewportIndex);

        // Show success status
        if (document.getElementById('status')) {
            document.getElementById('status').innerHTML = `Successfully loaded ${filePath}`;
            document.getElementById('status').className = 'success';
        }
    } catch (error) {
        console.error("Error loading DICOM file:", error);
        if (document.getElementById('status')) {
            document.getElementById('status').innerHTML = `Error loading file: ${error.message}`;
            document.getElementById('status').className = 'error';
        }
    }
};

// Display an image in a viewport
ComparisonView.prototype.displayImage = function(imageData, index) {
    console.log(`DEBUG: Displaying image in viewport index ${index}`);
    
    const viewport = this.viewports[index];
    if (!viewport) {
        console.error(`DEBUG: Error - viewport ${index} does not exist`);
        return;
    }

    console.log(`DEBUG: Viewport ${index} before update: hasImage=${viewport.hasImage}, row=${viewport.row}, col=${viewport.col}`);

    // Reset viewport settings when loading a new image
    viewport.zoomLevel = 1;
    viewport.panOffsetX = 0;
    viewport.panOffsetY = 0;
    viewport.brightness = 0;
    viewport.contrast = 0;
    viewport.inverted = false;

    // Store image data
    viewport.hasImage = true;
    viewport.imageData = imageData;

    // Set canvas size
    viewport.canvas.width = imageData.width;
    viewport.canvas.height = imageData.height;

    // Draw image
    const ctx = viewport.canvas.getContext('2d');
    ctx.drawImage(imageData.canvas, 0, 0);

    // Hide drop zone, show canvas
    viewport.element.querySelector('.viewport-drop-zone').style.display = 'none';
    viewport.element.querySelector('.viewport-canvas-container').style.display = 'block';

    // Reset any applied filters
    viewport.canvas.style.filter = '';

    // Automatically fit the image to the viewport
    this.fitImageToViewport(index);

    // Extract key metadata
    let patientName = imageData.metadata['0x00100010'] || 'Unknown';
    let bodyPart = '';

    // Try to identify body part
    if (window.MetadataOrganizer) {
        const organizer = new MetadataOrganizer();
        const bodyPartInfo = organizer.identifyBodyPart(imageData.metadata);
        bodyPart = `${bodyPartInfo.part}${bodyPartInfo.laterality ? ' - ' + bodyPartInfo.laterality : ''}`;
    }
    
    console.log(`DEBUG: Viewport ${index} after update: hasImage=${viewport.hasImage}, row=${viewport.row}, col=${viewport.col}`);
    
    // Verify all viewport states after this update
    console.log("DEBUG: All viewport states after update:");
    this.viewports.forEach((vp, idx) => {
        console.log(`DEBUG: Viewport ${idx}: hasImage=${vp.hasImage}, row=${vp.row}, col=${vp.col}`);
    });

    // Display info
    viewport.info.innerHTML = `
        <div class="viewport-patient">${patientName}</div>
        <div class="viewport-bodypart">${bodyPart}</div>
    `;

    // Update patient info and metadata panels
    this.updateInfoPanels(imageData);
};

// Update patient info and metadata panels
ComparisonView.prototype.updateInfoPanels = function(imageData) {
    // Update metadata panel
    if (window.viewer && window.viewer.updateMetadataDisplay && imageData.metadata) {
        window.viewer.updateMetadataDisplay(imageData.metadata);
    }

    // Update patient info
    if (window.viewer && window.viewer.updatePatientInfoDisplay && imageData.metadata) {
        window.viewer.updatePatientInfoDisplay(imageData.metadata);
    }
};

// Fit image to viewport
ComparisonView.prototype.fitImageToViewport = function(index) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;

    const container = viewport.element.querySelector('.viewport-canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = viewport.canvas.width;
    const imageHeight = viewport.canvas.height;

    // Calculate the zoom level to fit the image
    const widthRatio = containerWidth / imageWidth;
    const heightRatio = containerHeight / imageHeight;

    // Use the smaller ratio to ensure the entire image fits
    let fitZoom = Math.min(widthRatio, heightRatio) * 0.95; // 95% to add a small margin

    // Don't zoom in more than 100%
    fitZoom = Math.min(fitZoom, 1);

    // Set the zoom level
    viewport.zoomLevel = fitZoom;

    // Center the image
    this.centerImage(index);

    // Update canvas position
    this.updateCanvasPosition(index);
};

// Center image in viewport
ComparisonView.prototype.centerImage = function(index) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;

    const container = viewport.element.querySelector('.viewport-canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = viewport.canvas.width * viewport.zoomLevel;
    const imageHeight = viewport.canvas.height * viewport.zoomLevel;

    viewport.panOffsetX = (containerWidth - imageWidth) / 2;
    viewport.panOffsetY = (containerHeight - imageHeight) / 2;

    this.updateCanvasPosition(index);
};

// Update canvas position based on zoom and pan
ComparisonView.prototype.updateCanvasPosition = function(index) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;

    viewport.canvas.style.transform =
        `translate(${viewport.panOffsetX}px, ${viewport.panOffsetY}px) scale(${viewport.zoomLevel})`;
};
