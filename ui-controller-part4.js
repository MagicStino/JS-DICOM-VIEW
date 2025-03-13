/**
 * UI Controller Module - Part 4
 * Handles user interface interactions and event handling
 */

// Global handler for dropped files
window.handleFileDrop = function(filePath, viewportIndex) {
    console.log("Global file drop handler called:", filePath, viewportIndex);

    // Check if comparison view is available
    if (window.comparisonView && viewportIndex !== undefined) {
        window.comparisonView.loadFileIntoViewport(filePath, viewportIndex);
        return true;
    }

    // Otherwise try to load in main viewer
    if (window.viewer && window.viewer.loadDicomFile) {
        window.viewer.loadDicomFile(filePath);
        return true;
    }

    return false;
};

// Set up callbacks for comparison view integration
window.onComparisonViewDrop = function(filePath, viewportIndex) {
    return window.handleFileDrop(filePath, viewportIndex);
};

// Initialize the comparison view - fixed version
DicomViewer.prototype.initComparisonView = function() {
    // Create the comparison view object immediately
    if (!window.comparisonView) {
        window.comparisonView = new ComparisonView();

        // Set up the callbacks for integration
        window.comparisonView.setupCallbacks = function() {
            // Create a callback for returning to single view
            window.onReturnToSingleView = (imageData) => {
                if (imageData && window.viewer && window.viewer.imageProcessor) {
                    // Display the image in the main viewer
                    window.viewer.imageProcessor.renderImage(imageData);

                    // Update metadata display
                    if (window.viewer.updateMetadataDisplay && imageData.metadata) {
                        window.viewer.updateMetadataDisplay(imageData.metadata);
                        if (window.viewer.updatePatientInfoDisplay) {
                            window.viewer.updatePatientInfoDisplay(imageData.metadata);
                        }
                    }
                }
            };

            // Create a callback for dropping files into viewports
            window.onComparisonViewDrop = (filePath, viewportIndex) => {
                if (window.viewer) {
                    window.viewer.loadFileIntoComparisonViewport(filePath, viewportIndex);
                } else {
                    console.warn("Viewer not available for handling drops");
                }
            };
        };

        // Set up the callbacks right away
        window.comparisonView.setupCallbacks();
    }
};

// Add comparison button after a file is loaded
DicomViewer.prototype.addComparisonButton = function() {
    // Don't add the button if it already exists
    if (document.getElementById('compareButton')) {
        return;
    }

    // Try to find the last control group
    const controlGroups = document.querySelectorAll('.control-group');
    if (controlGroups.length === 0) {
        console.warn("No control groups found to add comparison button");
        return;
    }

    const lastControlGroup = controlGroups[controlGroups.length - 1];

    // Create the comparison button
    const compareButton = document.createElement('button');
    compareButton.id = 'compareButton';
    compareButton.title = 'Comparison View';
    compareButton.textContent = 'Compare';

    // Add the button to the control group
    lastControlGroup.appendChild(compareButton);

    // Add event listener
    compareButton.addEventListener('click', () => {
        if (window.comparisonView) {
            window.comparisonView.show();
        } else {
            console.warn("Comparison view not available");
        }
    });
};

// Override the display method to add the button after loading
DicomViewer.prototype.displayDicomFile = function(imageData) {
    if (!imageData) return;

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

    // Now add the comparison button if it doesn't exist yet
    this.addComparisonButton();
};

// Display embedded documents from a DICOM file
DicomViewer.prototype.displayDocuments = function(documents) {
    // Initialize document handler if needed
    if (!this.documentHandler) {
        this.documentHandler = new DocumentHandler();
    }

    // Display the documents
    this.documentHandler.displayDocuments(documents);
};

// Update the DICOMDIR tab with structure information
DicomViewer.prototype.updateDicomdirDisplay = function(dicomdirData) {
    const dicomdirTab = document.getElementById('dicomdir-tab');
    if (!dicomdirTab) return;

    if (!dicomdirData || !dicomdirData.patients || dicomdirData.patients.length === 0) {
        dicomdirTab.innerHTML = '<p>No DICOMDIR information available for this dataset.</p>';
        return;
    }

    // Generate HTML representation
    const parser = new DicomdirParser();
    const html = parser.generateStructureHTML();
    dicomdirTab.innerHTML = html;
};

// Generate patient information display
DicomViewer.prototype.updatePatientInfoDisplay = function(metadata) {
    const patientInfoElement = document.getElementById('patientInfoContent');
    if (!patientInfoElement) return;

    // Check if we have patient data
    if (!metadata ||
        (!metadata['0x00100010'] && !metadata['0x00100020'] && !metadata['0x00100030'] && !metadata['0x00100040'])) {
        patientInfoElement.textContent = 'No patient information available';
        return;
    }

    // Create patient info table
    let html = '<table>';

    // Patient's name
    if (metadata['0x00100010']) {
        html += `<tr><td><strong>Name:</strong></td><td>${metadata['0x00100010']}</td></tr>`;
    }

    // Patient ID
    if (metadata['0x00100020']) {
        html += `<tr><td><strong>ID:</strong></td><td>${metadata['0x00100020']}</td></tr>`;
    }

    // Birth date
    if (metadata['0x00100030']) {
        html += `<tr><td><strong>Birth Date:</strong></td><td>${metadata['0x00100030']}</td></tr>`;
    }

    // Sex
    if (metadata['0x00100040']) {
        html += `<tr><td><strong>Sex:</strong></td><td>${metadata['0x00100040']}</td></tr>`;
    }

    // Add more information if available

    // Accession number
    if (metadata['0x00080050']) {
        html += `<tr><td><strong>Accession Number:</strong></td><td>${metadata['0x00080050']}</td></tr>`;
    }

    // Study date
    if (metadata['0x00080020']) {
        html += `<tr><td><strong>Study Date:</strong></td><td>${metadata['0x00080020']}</td></tr>`;
    }

    // Body part
    if (metadata['0x00180015']) {
        html += `<tr><td><strong>Body Part:</strong></td><td>${metadata['0x00180015']}</td></tr>`;
    }

    html += '</table>';

    // Try to identify body part information using the metadata organizer
    try {
        const metadataOrganizer = new MetadataOrganizer();
        const bodyPartInfo = metadataOrganizer.identifyBodyPart(metadata);

        if (bodyPartInfo && bodyPartInfo.part !== 'Unknown') {
            html += metadataOrganizer.generateBodyPartHTML(bodyPartInfo);
        }
    } catch (e) {
        console.error("Error generating body part information:", e);
    }

    patientInfoElement.innerHTML = html;
};

/**
 * Integration extensions for DicomViewer
 */

// Store reference to the original initialize method
const originalInitialize = DicomViewer.prototype.initialize;

// Override the initialize method to add additional integrations
DicomViewer.prototype.initialize = function() {
    // Call the original initialize method first
    if (originalInitialize) {
        originalInitialize.call(this);
    }

    // Enable automatic loading when files are selected
    if (this.fileManager) {
        this.fileManager.setAutoLoadEnabled(true);
    }

    // Make file manager available globally for integration
    window.fileManager = this.fileManager;

    // Make viewer available globally
    window.viewer = this;

    // Initialize comparison view
    this.initComparisonView();
};

// Add method to load a file into a comparison viewport
DicomViewer.prototype.loadFileIntoComparisonViewport = async function(filePath, viewportIndex) {
    try {
        // Show loading status
        document.getElementById('status').innerHTML =
            `<div><span class="spinner"></span> Loading ${filePath}...</div>`;
        document.getElementById('status').className = 'processing';

        // Get file data
        const fileBuffer = await this.fileManager.getFile(filePath);

        // Parse DICOM data
        const dicomData = DicomParser.parseDICOMFile(fileBuffer);

        if (!dicomData) {
            throw new Error("Failed to parse DICOM file");
        }

        // Extract and process pixel data
        const imageData = DicomParser.extractPixelData(dicomData);

        // Display in the viewport
        if (window.comparisonView) {
            window.comparisonView.displayImage(imageData, viewportIndex);
        } else {
            throw new Error("Comparison view not initialized");
        }

        // Show success status
        document.getElementById('status').innerHTML = `Successfully loaded ${filePath}`;
        document.getElementById('status').className = 'success';

    } catch (error) {
        console.error("Error loading DICOM file:", error);
        document.getElementById('status').innerHTML = `Error loading file: ${error.message}`;
        document.getElementById('status').className = 'error';
    }
};
