/**
 * UI Controller Module - Part 2
 * Handles additional UI functionality
 */

// Update metadata display
DicomViewer.prototype.updateMetadataDisplay = function(metadata) {
    const metadataElement = document.getElementById('metadata');
    if (!metadataElement) return;

    // Store the currently active tab before updating
    let activeTabCategory = null;
    const activeTabButton = document.querySelector('.metadata-tab-button.active');
    if (activeTabButton) {
        activeTabCategory = activeTabButton.getAttribute('data-category');
    }

    // Check if metadata organizer is available
    if (window.MetadataOrganizer) {
        try {
            const organizer = new MetadataOrganizer();
            const categorizedMetadata = organizer.organizeMetadata(metadata);
            const html = organizer.generateMetadataHTML(categorizedMetadata);
            metadataElement.innerHTML = html;

            // Add event listeners for metadata tabs
            document.querySelectorAll('.metadata-tab-button').forEach(button => {
                button.addEventListener('click', () => {
                    const category = button.getAttribute('data-category');

                    // Hide all tabs, show the selected one
                    document.querySelectorAll('.metadata-tab-content').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    document.querySelectorAll('.metadata-tab-button').forEach(btn => {
                        btn.classList.remove('active');
                    });

                    // Show selected tab
                    document.getElementById('metadata-' + category).classList.add('active');
                    button.classList.add('active');
                });
            });

            // If we had an active tab before, try to reselect it
            if (activeTabCategory) {
                const tabToSelect = document.querySelector(`.metadata-tab-button[data-category="${activeTabCategory}"]`);
                if (tabToSelect) {
                    tabToSelect.click();
                }
            }

            return;
        } catch (e) {
            console.error("Error using metadata organizer:", e);
        }
    }

    // Fallback to simple table display
    let html = '<table class="metadata-table">';
    html += '<tr><th>Tag</th><th>Description</th><th>Value</th></tr>';

    for (const [tag, value] of Object.entries(metadata)) {
        const tagName = window.DicomTagDictionary && window.DicomTagDictionary[tag]
            ? window.DicomTagDictionary[tag]
            : 'Unknown';

        html += `<tr><td>${tag}</td><td>${tagName}</td><td>${value}</td></tr>`;
    }

    html += '</table>';
    metadataElement.innerHTML = html;
};

// Update patient information display
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

// Reset image view settings
DicomViewer.prototype.resetImageView = function() {
    // Get UI elements
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');

    // Reset sliders
    if (brightnessSlider) brightnessSlider.value = 0;
    if (contrastSlider) contrastSlider.value = 0;

    // Reset image processor
    if (this.imageProcessor) {
        this.imageProcessor.resetView();
    }
};

// Set status message
DicomViewer.prototype.setStatus = function(message, type) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    statusElement.innerHTML = message;
    statusElement.className = type || '';
};

// Add a file to series
DicomViewer.prototype.addToSeries = function(filePath, imageData) {
    if (!imageData) return;

    // Add to series
    this.currentSeries.push(imageData);

    // Update series navigator if available
    if (this.seriesNavigator) {
        this.seriesNavigator.loadSeries(this.currentSeries);
    }
};
