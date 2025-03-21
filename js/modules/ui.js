/**
 * UI module for Docsify PDF Generator
 */
const UIManager = (function() {
    // Store DOM elements references
    let printButton, settingsDialog, progressBar, progressText, progressContainer;
    
    // Initialize UI components
    function initialize() {
        if (document.querySelector('.pdf-button')) {
            Logger.debug('PDF button already exists, skipping initialization');
            return;
        }
        
        Logger.debug('Creating UI elements...');
        createSettingsDialog();
        createPrintButton();
        setupEventListeners();
        
        document.querySelector('.pdf-button') ? 
            Logger.debug('PDF button created successfully') : 
            Logger.error('PDF button creation failed!');
    }
    
    // Create settings dialog with all configuration options
    function createSettingsDialog() {
        settingsDialog = document.createElement('div');
        
        // Set common dialog styles
        Object.assign(settingsDialog.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            zIndex: '500',
            display: 'none',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        });
        
        // Add dialog content
        settingsDialog.innerHTML = `
            <h3>PDF Settings</h3>
            <!-- Basic PDF settings -->
            <div style="margin-bottom: 10px;">
                <label for="paperSize">Paper Size:</label>
                <select id="paperSize" style="margin-left: 5px;">
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="orientation">Orientation:</label>
                <select id="orientation" style="margin-left: 5px;">
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="theme">Theme:</label>
                <select id="themeSelect" style="margin-left: 5px;">
                    ${generateThemeOptions()}
                </select>
                <div style="font-size: 10px; color: #999; margin-top: 3px;">
                    Changes document colors and styles
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="margins">Margins (mm):</label>
                <input type="number" id="margins" min="5" max="50" value="10" style="width: 50px; margin-left: 5px;">
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="imageQuality">Image Quality:</label>
                <select id="imageQuality" style="margin-left: 5px;">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>Include:</label>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="includeHeader" checked>
                    <label for="includeHeader">Headers</label>
                </div>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="includeImages" checked>
                    <label for="includeImages">Images</label>
                </div>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="includeCode" checked>
                    <label for="includeCode">Code Blocks</label>
                </div>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="includeTables" checked>
                    <label for="includeTables">Tables</label>
                </div>
                <div style="margin-left: 20px;">
                    <input type="checkbox" id="respectPageBreaks" checked>
                    <label for="respectPageBreaks">LaTeX Commands</label>
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label for="pdfVersion">PDF Compatibility:</label>
                <select id="pdfVersion" style="margin-left: 5px;">
                    <option value="1.3">PDF 1.3 (Acrobat 4)</option>
                    <option value="1.4" selected>PDF 1.4 (Acrobat 5)</option>
                    <option value="1.5">PDF 1.5 (Acrobat 6)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>Image Format:</label>
                <select id="imageFormat" style="margin-left: 5px;">
                    <option value="JPEG" selected>JPEG (smaller files)</option>
                    <option value="PNG">PNG (better quality)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label>SVG Handling:</label>
                <select id="svgHandling" style="margin-left: 5px;">
                    <option value="raster" selected>Raster (high-quality)</option>
                    <option value="vector" disabled>Vector (temporarily disabled)</option>
                </select>
                <div style="font-size: 10px; color: #999; margin-top: 3px;">
                    Using enhanced raster rendering for best quality
                </div>
            </div>
            
            <div style="margin-bottom: 10px; padding: 5px; background-color: #f8f8f8; border-radius: 4px;">
                <div style="font-size: 12px; color: #42b983;">
                    <strong>New!</strong> PDF now supports clickable links and text formatting
                </div>
            </div>
            
            <!-- UI controls for PDF generation -->
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="startPDF" style="padding: 8px 15px; background-color: #42b983; color: white; border: none; border-radius: 4px; cursor: pointer;">Generate PDF</button>
                <button id="cancelPDF" style="padding: 8px 15px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="debugPDF" style="padding: 8px 15px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Debug</button>
            </div>
            
            <!-- Progress tracking -->
            <div id="progressContainer" style="display: none; margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <div id="progressText">Processing...</div>
                    <div>
                        <button id="minimizeProgress" style="background: none; border: none; font-size: 16px; cursor: pointer; margin-right: 5px;">−</button>
                        <button id="closeProgress" style="background: none; border: none; font-size: 16px; cursor: pointer;">×</button>
                    </div>
                </div>
                <progress id="progressBar" value="0" max="100" style="width: 100%; margin-top: 5px;"></progress>
                <div id="progressStepDetail" style="font-size: 11px; color: #666; margin-top: 5px;"></div>
            </div>
        `;
        
        document.body.appendChild(settingsDialog);
        
        // Cache DOM references for better performance
        progressContainer = document.getElementById('progressContainer');
        progressBar = document.getElementById('progressBar');
        progressText = document.getElementById('progressText');
        
        // Set up minimize/close buttons
        setupProgressControls();
    }
    
    // Set up progress control buttons
    function setupProgressControls() {
        // Minimize button handler
        document.getElementById('minimizeProgress').addEventListener('click', function() {
            const isMinimized = progressBar.style.display === 'none';
            const progressStepDetail = document.getElementById('progressStepDetail');
            
            // Toggle minimized state
            progressBar.style.display = isMinimized ? 'block' : 'none';
            progressStepDetail.style.display = isMinimized ? 'block' : 'none';
            this.textContent = isMinimized ? '−' : '+';
        });
        
        // Close button handler
        document.getElementById('closeProgress').addEventListener('click', () => {
            settingsDialog.style.display = 'none';
        });
    }
    
    // Generate theme options for selector
    function generateThemeOptions() {
        if (typeof ThemeManager === 'undefined') {
            return '<option value="light">Light</option><option value="dark">Dark</option>';
        }
        
        const themes = ThemeManager.getAvailableThemes();
        const currentTheme = ThemeManager.getCurrentTheme().name.toLowerCase();
        
        return themes.map(theme => {
            const themeName = typeof theme === 'string' ? theme : theme.name;
            const isSelected = themeName.toLowerCase() === currentTheme ? 'selected' : '';
            
            // Display name with first letter capitalized
            const displayName = themeName.charAt(0).toUpperCase() + themeName.slice(1).toLowerCase();
            
            return `<option value="${themeName}" ${isSelected}>${displayName}</option>`;
        }).join('');
    }
    
    // Create the PDF button
    function createPrintButton() {
        printButton = document.createElement('button');
        printButton.innerText = 'Print to PDF';
        printButton.className = 'pdf-button';
        
        // Apply isolated style to avoid interference with other elements
        Object.assign(printButton.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '8px 15px',
            backgroundColor: '#42b983',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '3',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            userSelect: 'none'
        });
        
        // Add directly to body for isolation
        try {
            document.body.appendChild(printButton);
            Logger.debug('Print button added to document body');
        } catch (e) {
            Logger.error('Error adding print button to DOM:', e);
            setTimeout(() => {
                try {
                    document.body.appendChild(printButton);
                    Logger.debug('Print button added to DOM (delayed)');
                } catch (e2) {
                    Logger.error('Fatal error adding print button:', e2);
                }
            }, 1000);
        }
    }
    
    // Adjust button position (simplified)
    function adjustButtonPosition() {
        if (!printButton) return;
        
        // Keep fixed position to avoid interference
        printButton.style.right = '20px';
        printButton.style.bottom = '20px';
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Button click handlers
        printButton.addEventListener('click', showSettingsDialog);
        document.getElementById('startPDF').addEventListener('click', startPdfGeneration);
        document.getElementById('cancelPDF').addEventListener('click', closeSettingsDialog);
        document.getElementById('debugPDF').addEventListener('click', debugPdfGeneration);
    }
    
    // Show settings dialog
    function showSettingsDialog() {
        settingsDialog.style.display = 'block';
        createOverlay();
    }
    
    // Close settings dialog
    function closeSettingsDialog() {
        settingsDialog.style.display = 'none';
        resetDialogToSettingsMode();
        removeOverlay();
    }
    
    // Start PDF generation
    function startPdfGeneration() {
        const options = getOptions();
        
        // Hide settings, show progress
        document.querySelectorAll('#settingsDialog h3, #settingsDialog div:not(#progressContainer)').forEach(element => {
            if (element.id !== 'progressContainer' && !element.closest('#progressContainer')) {
                element.style.display = 'none';
            }
        });
        
        // Show progress updates
        progressContainer.style.display = 'block';
        document.getElementById('progressStepDetail').style.display = 'block';
        progressText.textContent = 'Initializing PDF generation...';
        
        // Start PDF generation with small delay for UI updates
        setTimeout(() => {
            if (typeof PDFGenerator?.generatePDF === 'function') {
                PDFGenerator.generatePDF(options);
            } else {
                updateProgress(0, 'Error: PDF Generator not available', 'Please reload the page and try again.');
                console.error('PDFGenerator is not available');
            }
        }, 100);
    }
    
    // Debug PDF generation
    function debugPdfGeneration() {
        const options = getOptions();
        settingsDialog.style.display = 'none';
        
        if (typeof PDFGenerator?.debugPDF === 'function') {
            PDFGenerator.debugPDF(options);
        } else {
            showErrorMessage('PDF Generator not ready. Please reload the page.');
        }
    }
    
    // Show temporary error message
    function showErrorMessage(message, duration = 5000) {
        const errorBox = document.createElement('div');
        Object.assign(errorBox.style, {
            position: 'fixed',
            bottom: '70px',
            right: '20px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            borderRadius: '5px',
            zIndex: '1000'
        });
        errorBox.textContent = message;
        document.body.appendChild(errorBox);
        
        setTimeout(() => {
            if (errorBox.parentNode) errorBox.parentNode.removeChild(errorBox);
        }, duration);
    }
    
    // Create semi-transparent overlay
    function createOverlay() {
        if (document.getElementById('pdfSettingsOverlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'pdfSettingsOverlay';
        
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: '200'
        });
        
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeSettingsDialog();
        });
        
        document.body.appendChild(overlay);
    }
    
    // Remove overlay
    function removeOverlay() {
        const overlay = document.getElementById('pdfSettingsOverlay');
        if (overlay) document.body.removeChild(overlay);
    }
    
    // Get all options from form fields
    function getOptions() {
        // Fixed options that shouldn't change
        const fixedOptions = { svgHandling: 'raster' };
        
        // Extract form field values
        const formOptions = {
            paperSize: document.getElementById('paperSize').value,
            orientation: document.getElementById('orientation').value,
            theme: document.getElementById('themeSelect').value,
            margins: document.getElementById('margins').value,
            imageQuality: document.getElementById('imageQuality').value,
            pdfVersion: document.getElementById('pdfVersion').value,
            imageFormat: document.getElementById('imageFormat').value,
            includeHeader: document.getElementById('includeHeader').checked,
            includeImages: document.getElementById('includeImages').checked,
            includeCode: document.getElementById('includeCode').checked,
            includeTables: document.getElementById('includeTables').checked,
            respectPageBreaks: document.getElementById('respectPageBreaks').checked
        };
        
        return {...formOptions, ...fixedOptions};
    }
    
    // Reset dialog to settings mode
    function resetDialogToSettingsMode() {
        // Show all settings fields
        settingsDialog.querySelectorAll('div').forEach(field => {
            field.style.display = '';
        });
        
        // Hide progress
        if (progressContainer) progressContainer.style.display = 'none';
        
        // Reset dialog size
        settingsDialog.style.maxWidth = '500px';
        document.getElementById('progressStepDetail').textContent = '';
    }
    
    // Update progress bar and text
    function updateProgress(value, text, details) {
        if (!progressContainer) return;
        
        settingsDialog.style.display = 'block';
        progressContainer.style.display = 'block';
        progressBar.value = value;
        if (text) progressText.textContent = text;
        
        const detailsElement = document.getElementById('progressStepDetail');
        if (details && detailsElement) detailsElement.textContent = details;
        
        // Auto-close on completion
        if (value >= 100) {
            // Show success message
            progressText.textContent = 'PDF generated successfully!';
            detailsElement.textContent = 'Your download should begin automatically.';
            
            // Auto-close after delay
            setTimeout(() => {
                resetDialogToSettingsMode();
                settingsDialog.style.display = 'none';
                removeOverlay();
            }, 3000);
        }
    }
    
    return {
        initialize,
        updateProgress,
        adjustButtonPosition
    };
})();
