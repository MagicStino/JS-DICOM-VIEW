/**
 * Comparison View Module - Part 5
 * Image manipulation (brightness, contrast, zoom)
 */

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

    // Determine the new invert state - toggle based on first viewport
    let newInvertState = false;
    if (viewportsToUpdate.length > 0) {
        const firstViewport = this.viewports[viewportsToUpdate[0]];
        newInvertState = !firstViewport.inverted;
    }

    viewportsToUpdate.forEach(index => {
        const viewport = this.viewports[index];
        viewport.inverted = newInvertState;
        this.applyFilters(index);
    });
};

// Zoom selected viewports
ComparisonView.prototype.zoomSelectedViewports = function(delta) {
    const viewportsToUpdate = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);

    viewportsToUpdate.forEach(index => {
        this.adjustZoom(delta, index);
    });
};

// Reset zoom for selected viewports
ComparisonView.prototype.resetZoomForSelectedViewports = function() {
    const viewportsToUpdate = this.selectedViewports.length > 0
        ? this.selectedViewports
        : this.viewports
            .filter(viewport => viewport.hasImage)
            .map((_, index) => index);

    viewportsToUpdate.forEach(index => {
        this.fitImageToViewport(index);

        // Also reset brightness and contrast
        this.viewports[index].brightness = 0;
        this.viewports[index].contrast = 0;
        this.viewports[index].inverted = false;
        this.applyFilters(index);
    });

    // Reset control sliders
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');

    if (brightnessSlider) brightnessSlider.value = 0;
    if (contrastSlider) contrastSlider.value = 0;
};

// Adjust zoom level for a viewport
ComparisonView.prototype.adjustZoom = function(delta, index, e) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;

    // Store old zoom for calculating adjusted pan
    const oldZoom = viewport.zoomLevel;

    // Update zoom level with limits
    viewport.zoomLevel = Math.max(0.1, Math.min(10, viewport.zoomLevel + delta));

    // Get the viewport container dimensions
    const container = viewport.element.querySelector('.viewport-canvas-container');
    const rect = container.getBoundingClientRect();
    
    // Always use the center of the viewport as the anchor point
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Adjust pan to keep the center point at the same position
    viewport.panOffsetX = centerX - (centerX - viewport.panOffsetX) * (viewport.zoomLevel / oldZoom);
    viewport.panOffsetY = centerY - (centerY - viewport.panOffsetY) * (viewport.zoomLevel / oldZoom);

    this.updateCanvasPosition(index);
};
/*
// Sync zoom with other selected viewports to a specific zoom level
ComparisonView.prototype.syncZoom = function(sourceIndex, zoomLevel) {
    const viewportsToSync = this.selectedViewports.length > 0
        ? this.selectedViewports.filter(index => index !== sourceIndex)
        : this.viewports
            .filter((viewport, index) => viewport.hasImage && index !== sourceIndex)
            .map((_, index) => index);

    viewportsToSync.forEach(index => {
        const viewport = this.viewports[index];
        if (!viewport || !viewport.hasImage) return;

        viewport.zoomLevel = zoomLevel;
        this.updateCanvasPosition(index);
    });
};
*/
// Set up callbacks for integration with the main application
ComparisonView.prototype.setupCallbacks = function() {
    // Create a callback for dropping files into viewports
    window.onComparisonViewDrop = (filePath, viewportIndex) => {
        this.loadFileIntoViewport(filePath, viewportIndex);
    };

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
};

// Make the constructor available globally
window.ComparisonView = ComparisonView;
