/**
 * Comparison View Module - Part 2
 * Layout and viewport management
 */

// Set layout for comparison view
ComparisonView.prototype.setLayout = function(layout) {
    if (!this.layouts[layout]) return;

    this.currentLayout = layout;
    const { rows, cols } = this.layouts[layout];

    // Get container
    const container = document.getElementById('viewport-container');
    container.innerHTML = '';

    // Set grid layout
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    console.log(`DEBUG: Setting up ${layout} layout with ${rows} rows and ${cols} columns`);

    // Save current viewport data to reuse if possible
    const oldViewports = this.viewports;
    const oldLayout = oldViewports.length > 0 ? { 
        rows: Math.max(...oldViewports.map(v => v.row || 0)) + 1,
        cols: Math.max(...oldViewports.map(v => v.col || 0)) + 1
    } : null;
    
    console.log(`DEBUG: Old layout: ${oldLayout ? `${oldLayout.rows}x${oldLayout.cols}` : 'none'}`);
    console.log(`DEBUG: New layout: ${rows}x${cols}`);
    
    // Clear viewports and selection
    this.viewports = [];
    this.selectedViewports = [];

    // Create viewports - ensure they're added in order (left to right, top to bottom)
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            
            const viewport = document.createElement('div');
            viewport.className = 'viewport';
            viewport.setAttribute('data-index', index);
            viewport.setAttribute('data-row', row);
            viewport.setAttribute('data-col', col);
            
            // Explicitly set grid position to ensure correct order
            viewport.style.gridRow = `${row + 1}`;
            viewport.style.gridColumn = `${col + 1}`;

            // Add drop zone
            viewport.innerHTML = `
                <div class="viewport-drop-zone" data-index="${index}">
                    <div class="drop-icon">📥</div>
                    <div class="drop-text">Drop DICOM Image Here</div>
                </div>
                <div class="viewport-canvas-container" style="display: none;">
                    <canvas class="viewport-canvas"></canvas>
                </div>
                <div class="viewport-info"></div>
                <div class="viewport-toolbar">
                    <button class="viewport-clear" title="Clear Viewport">Clear</button>
                </div>
            `;

            container.appendChild(viewport);

            // Initialize empty viewport
            const viewportObj = {
                element: viewport,
                canvas: viewport.querySelector('.viewport-canvas'),
                info: viewport.querySelector('.viewport-info'),
                hasImage: false,  // Always initialize as false when changing layouts
                imageData: null,
                zoomLevel: 1,
                panOffsetX: 0,
                panOffsetY: 0,
                brightness: 0,
                contrast: 0,
                inverted: false,
                selected: false,
                row: row,
                col: col
            };

            // Only try to reuse data if the layout hasn't changed
            // This prevents carrying over data when switching between different layouts
            if (oldLayout && 
                oldLayout.rows === rows && 
                oldLayout.cols === cols && 
                oldViewports[index] && 
                oldViewports[index].hasImage) {
                
                console.log(`DEBUG: Reusing image data for viewport ${index}`);
                viewportObj.imageData = oldViewports[index].imageData;
                viewportObj.hasImage = true;
                // We'll display the image after adding to the viewports array
            } else {
                console.log(`DEBUG: Not reusing data for viewport ${index} - new viewport or layout changed`);
            }

            this.viewports.push(viewportObj);

            // Set up drop zone, clear button, and interaction events
            this.setupDropZone(viewport, index);
            this.setupViewportButtons(viewport, index);
            this.setupViewportInteractions(viewport, index);
            
            // Now display the image if we're reusing data
            if (viewportObj.hasImage && viewportObj.imageData) {
                this.displayImage(viewportObj.imageData, index);
            }
            
            // Add debug info
            console.log(`DEBUG: Created viewport ${index} at position row=${row+1}, col=${col+1} (grid-row=${viewport.style.gridRow}, grid-column=${viewport.style.gridColumn}, hasImage=${viewportObj.hasImage})`);
        }
    }
    
    // Verify the viewport order in the array
    console.log("DEBUG: Final viewport array order:");
    this.viewports.forEach((viewport, idx) => {
        console.log(`DEBUG: this.viewports[${idx}]: row=${viewport.row}, col=${viewport.col}, hasImage=${viewport.hasImage}`);
    });
};

// Setup viewport buttons and handlers
ComparisonView.prototype.setupViewportButtons = function(viewport, index) {
    // Set up clear button
    const clearButton = viewport.querySelector('.viewport-clear');
    clearButton.addEventListener('click', () => {
        this.clearViewport(index);
    });

    // Set up click handler for viewport selection
    viewport.addEventListener('click', (e) => {
        // Don't trigger selection when clicking buttons
        if (e.target.tagName === 'BUTTON') return;

        const viewportIndex = parseInt(viewport.getAttribute('data-index'));
        this.toggleViewportSelection(viewportIndex, e.ctrlKey);
    });
};

// Toggle viewport selection
ComparisonView.prototype.toggleViewportSelection = function(index, addToSelection) {
    if (index < 0 || index >= this.viewports.length || !this.viewports[index].hasImage) return;

    const viewport = this.viewports[index];

    if (!addToSelection) {
        // Deselect all other viewports if not adding to selection
        this.deselectAllViewports();
    }

    // Toggle selected state
    viewport.selected = !viewport.selected;

    // Update selection visuals
    if (viewport.selected) {
        // Add to selected list if not already there
        if (!this.selectedViewports.includes(index)) {
            this.selectedViewports.push(index);
        }
        viewport.element.classList.add('selected');
        
        // Update metadata display for the selected viewport
        if (viewport.imageData && viewport.imageData.metadata) {
            this.updateInfoPanels(viewport.imageData);
        }
    } else {
        // Remove from selected list
        const selIndex = this.selectedViewports.indexOf(index);
        if (selIndex !== -1) {
            this.selectedViewports.splice(selIndex, 1);
        }
        viewport.element.classList.remove('selected');
    }

    // Update UI controls to reflect the selected viewport's settings
    if (viewport.selected && this.selectedViewports.length === 1) {
        this.updateControlsToViewportSettings(index);
    }
};

// Select all viewports
ComparisonView.prototype.selectAllViewports = function() {
    this.viewports.forEach((viewport, index) => {
        if (viewport.hasImage) {
            viewport.selected = true;
            viewport.element.classList.add('selected');

            // Add to selected list if not already there
            if (!this.selectedViewports.includes(index)) {
                this.selectedViewports.push(index);
            }
        }
    });
};

// Deselect all viewports
ComparisonView.prototype.deselectAllViewports = function() {
    this.viewports.forEach((viewport) => {
        viewport.selected = false;
        viewport.element.classList.remove('selected');
    });
    this.selectedViewports = [];
};
