/**
 * Comparison View Module - Part 3
 * Interactions and event handling
 */

// Setup viewport interaction events (mouse wheel, drag, etc.)
ComparisonView.prototype.setupViewportInteractions = function(viewport, index) {
    // Set up wheel event for zooming
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();

        // Only affect selected viewports
        if (this.viewports[index].selected || this.selectedViewports.length === 0) {
            const viewportObj = this.viewports[index];
            if (!viewportObj || !viewportObj.hasImage) return;
            
            // Get viewport rect for mouse position calculation
            const viewportRect = viewport.getBoundingClientRect();
            
            // Calculate mouse position relative to the viewport
            const mouseX = e.clientX - viewportRect.left;
            const mouseY = e.clientY - viewportRect.top;
            
            // Calculate zoom delta (positive for zoom in, negative for zoom out)
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            
            // Calculate new zoom level with limits
            const minZoom = 0.1;
            const maxZoom = 10;
            const oldZoom = viewportObj.zoomLevel;
            const newZoom = Math.max(minZoom, Math.min(maxZoom, oldZoom * (1 + delta)));
            
            // If zoom level didn't change significantly, don't update
            if (Math.abs(newZoom - oldZoom) < 0.01) return;
            
            // Convert mouse position to image coordinates before zoom change
            const imageX = (mouseX - viewportObj.panOffsetX) / oldZoom;
            const imageY = (mouseY - viewportObj.panOffsetY) / oldZoom;
            
            // Update zoom level
            viewportObj.zoomLevel = newZoom;
            
            // Adjust pan offset to keep the mouse point over the same image point
            viewportObj.panOffsetX = mouseX - (imageX * newZoom);
            viewportObj.panOffsetY = mouseY - (imageY * newZoom);
            
            // Update canvas position
            this.updateCanvasPosition(index);
        }
    });

    // Set up mouse events for panning
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    viewport.addEventListener('mousedown', (e) => {
        // Don't start dragging when clicking buttons
        if (e.target.tagName === 'BUTTON') return;

        if (!this.viewports[index].hasImage) return;

        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        // Select viewport if it's not already selected and not using Ctrl
        if (!this.viewports[index].selected && !e.ctrlKey) {
            this.deselectAllViewports();
            this.toggleViewportSelection(index, false);
        }

        // Set style to indicate dragging
        viewport.style.cursor = 'grabbing';
    });

    viewport.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        // Pan all selected viewports
        if (this.viewports[index].selected) {
            this.selectedViewports.forEach(selectedIndex => {
                this.panViewport(selectedIndex, dx, dy);
            });
        } else {
            this.panViewport(index, dx, dy);
        }

        dragStartX = e.clientX;
        dragStartY = e.clientY;
    });

    viewport.addEventListener('mouseup', () => {
        if (!isDragging) return;

        isDragging = false;
        viewport.style.cursor = 'default';
    });

    viewport.addEventListener('mouseleave', () => {
        if (!isDragging) return;

        isDragging = false;
        viewport.style.cursor = 'default';
    });
};

// Setup all drop zones
ComparisonView.prototype.setupDropZones = function() {
    this.viewports.forEach((viewport, index) => {
        this.setupDropZone(viewport.element, index);
    });
};

// Setup drop zone for a viewport
ComparisonView.prototype.setupDropZone = function(viewport, index) {
    const dropZone = viewport.querySelector('.viewport-drop-zone');
    if (!dropZone) return;

    // Make drop zone more visible
    dropZone.style.display = 'flex';
    dropZone.style.flexDirection = 'column';
    dropZone.style.justifyContent = 'center';
    dropZone.style.alignItems = 'center';

    // Remove any existing handlers to avoid duplicates
    const newDropZone = dropZone.cloneNode(true);
    if (dropZone.parentNode) {
        dropZone.parentNode.replaceChild(newDropZone, dropZone);
    }

    // Handle drag over
    newDropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });

    // Handle drag leave
    newDropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });

    // Handle drop
    newDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        newDropZone.classList.remove('dragover');

        // Check if this is an internal drag (text/plain with file path) or external file
        const filePath = e.dataTransfer.getData('text/plain');
        console.log("File dropped in viewport", index, ":", filePath);

        if (filePath && window.comparisonView) {
            // This is an internal drag from the file tree
            window.comparisonView.loadFileIntoViewport(filePath, index);
        } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // This is an external file being dragged in
            const file = e.dataTransfer.files[0];
            console.log("External file dropped:", file.name);
            
            // Check if we're in 1x1 layout, always load into viewport 0 in that case
            if (window.comparisonView.currentLayout === '1x1') {
                window.comparisonView.handleDroppedFile(file, 0);
            } else {
                window.comparisonView.handleDroppedFile(file, index);
            }
        }
    });
    
    // Also set up drag and drop on the entire viewport and canvas container
    // This allows dropping files even when an image is already loaded
    const canvasContainer = viewport.querySelector('.viewport-canvas-container');
    if (canvasContainer) {
        canvasContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.add('dragover');
        });
        
        canvasContainer.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('dragover');
        });
        
        canvasContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            canvasContainer.classList.remove('dragover');
            
            // Check if this is an internal drag (text/plain with file path) or external file
            const filePath = e.dataTransfer.getData('text/plain');
            console.log("File dropped on canvas in viewport", index, ":", filePath);
            
            if (filePath && window.comparisonView) {
                // This is an internal drag from the file tree
                window.comparisonView.loadFileIntoViewport(filePath, index);
            } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                // This is an external file being dragged in
                const file = e.dataTransfer.files[0];
                console.log("External file dropped on canvas:", file.name);
                
                // Check if we're in 1x1 layout, always load into viewport 0 in that case
                if (window.comparisonView.currentLayout === '1x1') {
                    window.comparisonView.handleDroppedFile(file, 0);
                } else {
                    window.comparisonView.handleDroppedFile(file, index);
                }
            }
        });
    }
};

// Pan viewport by a given amount
ComparisonView.prototype.panViewport = function(index, dx, dy) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;

    viewport.panOffsetX += dx;
    viewport.panOffsetY += dy;
    this.updateCanvasPosition(index);

};

// Sync pan with other selected viewports
ComparisonView.prototype.syncPan = function(sourceIndex, dx, dy) {
    this.viewports.forEach((viewport, index) => {
        if (index !== sourceIndex && viewport.hasImage &&
            (this.selectedViewports.includes(index) || this.selectedViewports.length === 0)) {
            viewport.panOffsetX += dx;
            viewport.panOffsetY += dy;
            this.updateCanvasPosition(index);
        }
    });
};

// Update controls to match viewport settings
ComparisonView.prototype.updateControlsToViewportSettings = function(index) {
    const viewport = this.viewports[index];
    if (!viewport || !viewport.hasImage) return;

    // Get main slider elements
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');

    // Get fullscreen slider elements
    const fsBrightnessSlider = document.querySelector('#fs-brightness-slider');
    const fsContrastSlider = document.querySelector('#fs-contrast-slider');

    // Update main sliders
    if (brightnessSlider) {
        brightnessSlider.value = viewport.brightness;
    }

    if (contrastSlider) {
        contrastSlider.value = viewport.contrast;
    }
    
    // Update fullscreen sliders
    if (fsBrightnessSlider) {
        fsBrightnessSlider.value = viewport.brightness;
    }

    if (fsContrastSlider) {
        fsContrastSlider.value = viewport.contrast;
    }
};

// Reset controls to match the settings of the first selected viewport
ComparisonView.prototype.resetControlsToViewportSettings = function() {
    if (this.selectedViewports.length > 0) {
        this.updateControlsToViewportSettings(this.selectedViewports[0]);
    } else if (this.viewports.some(v => v.hasImage)) {
        // Find the first viewport with an image
        const index = this.viewports.findIndex(v => v.hasImage);
        if (index !== -1) {
            this.updateControlsToViewportSettings(index);
        }
    }
};
