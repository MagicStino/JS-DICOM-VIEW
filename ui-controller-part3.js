/**
 * UI Controller Module - Part 3
 * Handles additional UI functionality and callbacks
 */

// Load and display a DICOM file - Updated with statusElement fix
DicomViewer.prototype.loadDicomFile = async function(filePath) {
    if (!filePath) return;

    try {
        // Show loading status
        document.getElementById('status').innerHTML =
            `<div><span class="spinner"></span> Loading ${filePath}...</div>`;
        document.getElementById('status').className = 'processing';

        // Reset view settings
        this.resetImageView();

        // Get file data from ZIP
        const fileBuffer = await this.fileManager.getFile(filePath);

        // Parse DICOM data
        const dicomData = DicomParser.parseDICOMFile(fileBuffer);

        if (!dicomData) {
            throw new Error("Failed to parse DICOM file");
        }

        // Extract and process pixel data
        const imageData = DicomParser.extractPixelData(dicomData);

        // Display the image
        this.displayDicomFile(imageData);

        // Add to series if DICOMDIR info is available
        if (window.dicomdirParser) {
            const metadata = window.dicomdirParser.getMetadataForFile(filePath);
            if (metadata) {
                console.log("Found DICOMDIR metadata for", filePath, metadata);

                // TODO: Build series from DICOMDIR
            }
        }

        // Show success status using DOM directly
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.innerHTML = `Successfully loaded ${filePath}`;
            statusElement.className = 'success';
        }

        // Add comparison button if needed
        this.addComparisonButton();

    } catch (error) {
        console.error("Error loading DICOM file:", error);

        // Show error status using DOM directly
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.innerHTML = `Error loading file: ${error.message}`;
            statusElement.className = 'error';
        }
    }
};

// Load a series of files from the same directory
DicomViewer.prototype.loadSeries = async function(directory) {
    try {
        // Show loading status
        document.getElementById('status').innerHTML =
            `<div><span class="spinner"></span> Loading series from ${directory}...</div>`;
        document.getElementById('status').className = 'processing';

        // Get all ZIP entries
        const seriesFiles = [];
        for (const path in this.fileManager.zipEntries) {
            if (path.startsWith(directory) && !this.fileManager.zipEntries[path].dir) {
                seriesFiles.push(path);
            }
        }

        console.log(`Found ${seriesFiles.length} files in ${directory}`);

        // Load each file
        this.currentSeries = [];

        for (const filePath of seriesFiles) {
            try {
                const fileBuffer = await this.fileManager.getFile(filePath);
                const dicomData = DicomParser.parseDICOMFile(fileBuffer);

                if (dicomData) {
                    const imageData = DicomParser.extractPixelData(dicomData);
                    this.currentSeries.push(imageData);
                }
            } catch (e) {
                console.warn(`Error loading ${filePath}:`, e);
            }
        }

        // Update series navigator
        if (this.seriesNavigator && this.currentSeries.length > 0) {
            this.seriesNavigator.loadSeries(this.currentSeries);

            // Display first image
            this.displayDicomFile(this.currentSeries[0]);
        }

        // Show success status
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.innerHTML = `Loaded ${this.currentSeries.length} images from ${directory}`;
            statusElement.className = 'success';
        }

    } catch (error) {
        console.error("Error loading series:", error);

        // Show error status
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.innerHTML = `Error loading series: ${error.message}`;
            statusElement.className = 'error';
        }
    }
};

// Extract embedded documents from a DICOM file
DicomViewer.prototype.extractDocuments = function(dicomData) {
    if (!dicomData || !dicomData.documents || dicomData.documents.length === 0) {
        return [];
    }

    return dicomData.documents;
};

// Build a series for a patient from DICOMDIR
DicomViewer.prototype.buildSeriesFromDicomdir = function(patientName, studyID, seriesID) {
    if (!window.dicomdirParser) return [];

    const seriesData = window.dicomdirParser.getSeriesData(patientName, studyID, seriesID);
    if (!seriesData) return [];

    // TODO: Build series from data

    return [];
};
