/**
 * UI module for Docsify PDF Generator
 */
const UIManager = (function() {
    // Store DOM elements references
    let printButton;
    let settingsDialog;
    let progressBar;
    let progressText;
    let progressContainer;
    
    // Initialize UI components
    function initialize() {
        // First check if button already exists to avoid duplicates
        if (document.querySelector('.pdf-button')) {
            Logger.debug('PDF button already exists, skipping initialization');
            return;
        }
        
        Logger.debug('Creating UI elements...');
        createSettingsDialog();
        createPrintButton();
        setupEventListeners();
        
        // Verify button exists after creation
        if (!document.querySelector('.pdf-button')) {
            Logger.error('PDF button creation failed!');
        } else {
            Logger.debug('PDF button created successfully');
        }
    }
    
    // Create the settings dialog
    function createSettingsDialog() {
        settingsDialog = document.createElement('div');
        settingsDialog.style.position = 'fixed';
        settingsDialog.style.top = '50%';
        settingsDialog.style.left = '50%';
        settingsDialog.style.transform = 'translate(-50%, -50%)';
        settingsDialog.style.padding = '20px';
        settingsDialog.style.backgroundColor = '#fff';
        settingsDialog.style.border = '1px solid #ccc';
        settingsDialog.style.zIndex = '1000';
        settingsDialog.style.display = 'none';
        settingsDialog.style.maxWidth = '500px';
        settingsDialog.style.width = '90%';
        settingsDialog.style.maxHeight = '80vh';
        settingsDialog.style.overflow = 'auto';
        settingsDialog.style.borderRadius = '8px';
        settingsDialog.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        
        settingsDialog.innerHTML = `
            <h3>PDF Settings</h3>
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
                <select id="theme" style="margin-left: 5px;">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
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
            
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="startPDF" style="padding: 8px 15px; background-color: #42b983; color: white; border: none; border-radius: 4px; cursor: pointer;">Generate PDF</button>
                <button id="cancelPDF" style="padding: 8px 15px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="debugPDF" style="padding: 8px 15px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Debug</button>
            </div>
            
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
        
        // Store progress elements
        progressContainer = document.getElementById('progressContainer');
        progressBar = document.getElementById('progressBar');
        progressText = document.getElementById('progressText');
        
        // Store additional progress elements
        const progressStepDetail = document.getElementById('progressStepDetail');
        
        // Add minimize button functionality
        document.getElementById('minimizeProgress').addEventListener('click', function() {
            const btn = this;
            const progressBarElem = document.getElementById('progressBar');
            const progressStepDetail = document.getElementById('progressStepDetail');
            
            if (progressBarElem.style.display !== 'none') {
                progressBarElem.style.display = 'none';
                progressStepDetail.style.display = 'none';
                btn.textContent = '+';
            } else {
                progressBarElem.style.display = 'block';
                progressStepDetail.style.display = 'block';
                btn.textContent = '−';
            }
        });
        
        document.getElementById('closeProgress').addEventListener('click', function() {
            settingsDialog.style.display = 'none';
            // Don't reset dialog yet - allow regeneration with same settings
        });
    }
    
    // Create the print button
    function createPrintButton() {
        printButton = document.createElement('button');
        printButton.innerText = 'Print to PDF';
        printButton.className = 'pdf-button'; // Add a class for easier selection
        printButton.style.position = 'fixed';
        printButton.style.bottom = '20px';
        printButton.style.right = '20px';
        printButton.style.padding = '8px 15px';
        printButton.style.backgroundColor = '#42b983';
        printButton.style.color = 'white';
        printButton.style.border = 'none';
        printButton.style.borderRadius = '4px';
        printButton.style.cursor = 'pointer';
        printButton.style.zIndex = '100';
        printButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        // Make button creation more robust
        try {
            document.body.appendChild(printButton);
            Logger.debug('Print button added to DOM');
        } catch (e) {
            Logger.error('Error adding print button to DOM:', e);
            // Try an alternative approach
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
    
    // Set up event listeners for UI interactions
    function setupEventListeners() {
        // Print button opens settings dialog
        printButton.addEventListener('click', () => {
            settingsDialog.style.display = 'block';
        });
        
        // Generate PDF button - FIXED: Keep dialog visible for progress updates
        document.getElementById('startPDF').addEventListener('click', () => {
            const options = getOptions();
            
            // Create a floating progress panel instead of modifying the dialog
            document.querySelectorAll('h3, div:not(#progressContainer)').forEach(element => {
                if (element.id !== 'progressContainer' && !element.closest('#progressContainer')) {
                    element.style.display = 'none';
                }
            });
            
            // Configure the progress container appearance for generation
            progressContainer.style.display = 'block';
            document.getElementById('progressStepDetail').style.display = 'block';
            progressText.textContent = 'Initializing PDF generation...';
            
            // Start PDF generation
            setTimeout(() => {
                // Ensure PDFGenerator is available
                if (typeof PDFGenerator !== 'undefined' && PDFGenerator && typeof PDFGenerator.generatePDF === 'function') {
                    PDFGenerator.generatePDF(options);
                } else {
                    updateProgress(0, 'Error: PDF Generator not available', 'Please reload the page and try again.');
                    console.error('PDFGenerator is not available');
                }
            }, 100);
        });
        
        // Cancel button
        document.getElementById('cancelPDF').addEventListener('click', () => {
            settingsDialog.style.display = 'none';
            resetDialogToSettingsMode();
        });
        
        // Debug button
        document.getElementById('debugPDF').addEventListener('click', () => {
            const options = getOptions();
            settingsDialog.style.display = 'none';
            
            // Ensure PDFGenerator is available
            if (typeof PDFGenerator !== 'undefined' && PDFGenerator && typeof PDFGenerator.debugPDF === 'function') {
                PDFGenerator.debugPDF(options);
            } else {
                console.error('PDFGenerator.debugPDF is not available');
                // Show an error message
                const errorBox = document.createElement('div');
                errorBox.style.position = 'fixed';
                errorBox.style.bottom = '70px';
                errorBox.style.right = '20px';
                errorBox.style.backgroundColor = '#f8d7da';
                errorBox.style.color = '#721c24';
                errorBox.style.padding = '10px';
                errorBox.style.borderRadius = '5px';
                errorBox.style.zIndex = '1000';
                errorBox.textContent = 'PDF Generator not ready. Please reload the page.';
                document.body.appendChild(errorBox);
                
                // Auto-remove after 5 seconds
                setTimeout(() => {
                    if (errorBox.parentNode) errorBox.parentNode.removeChild(errorBox);
                }, 5000);
            }
        });
    }
    
    // Get options from the form - force raster mode for SVGs
    function getOptions() {
        const options = {
            svgHandling: 'raster' // Force raster mode for now
        };
        
        // Get all options except svgHandling from form
        const form = {
            paperSize: document.getElementById('paperSize').value,
            orientation: document.getElementById('orientation').value,
            theme: document.getElementById('theme').value,
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
        
        // Merge form options with forced options
        return {...form, ...options};
    }
    
    // Reset dialog back to settings mode
    function resetDialogToSettingsMode() {
        // Show all settings fields again
        const settingsFields = settingsDialog.querySelectorAll('div');
        settingsFields.forEach(field => {
            field.style.display = '';
        });
        
        // Hide progress
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // Reset dialog size
        settingsDialog.style.maxWidth = '500px';
        document.getElementById('progressStepDetail').textContent = '';
    }
    
    // Update the progress bar
    function updateProgress(value, text, details) {
        if (!progressContainer) return;
        
        // Make sure dialog is visible
        settingsDialog.style.display = 'block';
        progressContainer.style.display = 'block';
        progressBar.value = value;
        
        if (text) {
            progressText.textContent = text;
        }
        
        // Show detailed step information if provided
        const detailsElement = document.getElementById('progressStepDetail');
        if (details && detailsElement) {
            detailsElement.textContent = details;
        }
        
        if (value >= 100) {
            // Show success message before closing
            progressText.textContent = 'PDF generated successfully!';
            detailsElement.textContent = 'Your download should begin automatically.';
            
            // Auto-close after delay
            setTimeout(() => {
                resetDialogToSettingsMode();
                settingsDialog.style.display = 'none';
            }, 3000);
        }
    }
    
    return {
        initialize,
        updateProgress
    };
})();
