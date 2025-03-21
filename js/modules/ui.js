/**
 * UI module for Docsify PDF Generator
 */
const UIManager = (function() {
    // Store DOM elements references
    let printButton, settingsDialog, progressBar, progressText, progressContainer;
    let isAdvancedMode = false; // Track if advanced settings are shown
    
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
        settingsDialog.id = 'pdfSettingsDialog';
        
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
        
        // Add dialog content with basic/advanced toggle
        settingsDialog.innerHTML = `
            <h3>PDF Settings</h3>
            <div class="settings-mode-toggle" style="margin-bottom: 15px; text-align: right;">
                <label>
                    <span style="margin-right: 8px; font-size: 12px;">Advanced Settings</span>
                    <input type="checkbox" id="advancedModeToggle" style="vertical-align: middle;">
                </label>
            </div>
            
            <!-- Basic Settings (Always Visible) -->
            <div class="basic-settings">
                <div style="margin-bottom: 10px;">
                    <label for="paperSize">Paper Size:</label>
                    <select id="paperSize" style="margin-left: 5px;">
                        <option value="a4" selected>A4</option>
                        <option value="letter">Letter</option>
                        <option value="legal">Legal</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="orientation">Orientation:</label>
                    <select id="orientation" style="margin-left: 5px;">
                        <option value="portrait" selected>Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="margins">Margins (mm):</label>
                    <input type="number" id="margins" min="0" max="50" value="10" style="width: 50px; margin-left: 5px;">
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="theme">Theme:</label>
                    <select id="theme" style="margin-left: 5px;">
                        ${generateThemeOptions()}
                    </select>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="imageQuality">Image Quality:</label>
                    <select id="imageQuality" style="margin-left: 5px;">
                        <option value="low">Low (Faster)</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High (Slower)</option>
                    </select>
                </div>
            </div>
            
            <!-- Advanced Settings (Initially Hidden) -->
            <div id="advancedSettings" style="display: none; border-top: 1px solid #eee; margin-top: 15px; padding-top: 15px;">
                <h4 style="margin-top: 0;">Advanced Settings</h4>
                
                <div style="margin-bottom: 10px;">
                    <label for="includeImages">Include Images:</label>
                    <input type="checkbox" id="includeImages" checked style="margin-left: 5px;">
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="includeTables">Include Tables:</label>
                    <input type="checkbox" id="includeTables" checked style="margin-left: 5px;">
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="includeCode">Include Code Blocks:</label>
                    <input type="checkbox" id="includeCode" checked style="margin-left: 5px;">
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="respectPageBreaks">Respect Page Breaks:</label>
                    <input type="checkbox" id="respectPageBreaks" checked style="margin-left: 5px;">
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="svgHandling">SVG Handling:</label>
                    <select id="svgHandling" style="margin-left: 5px;">
                        <option value="vector" selected>Vector (High Quality)</option>
                        <option value="raster">Raster (Compatible)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="imageFormat">Image Format:</label>
                    <select id="imageFormat" style="margin-left: 5px;">
                        <option value="JPEG" selected>JPEG (Smaller Files)</option>
                        <option value="PNG">PNG (Better Quality)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label for="pdfVersion">PDF Version:</label>
                    <select id="pdfVersion" style="margin-left: 5px;">
                        <option value="1.3">1.3 (More Compatible)</option>
                        <option value="1.4" selected>1.4</option>
                        <option value="1.5">1.5</option>
                        <option value="1.6">1.6</option>
                        <option value="1.7">1.7 (Latest, Less Compatible)</option>
                    </select>
                </div>
            </div>
            
            <!-- Buttons -->
            <div style="margin-top: 20px; display: flex; justify-content: space-between;">
                <button id="cancelButton" style="padding: 8px 15px; background-color: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="generateButton" style="padding: 8px 15px; background-color: #42b983; color: white; border: none; border-radius: 4px; cursor: pointer;">Generate PDF</button>
            </div>
            
            <div id="progressContainer" style="margin-top: 20px; display: none;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span id="progressText">Generating PDF...</span>
                    <span id="progressDetails" style="font-size: 11px; color: #666;"></span>
                </div>
                <progress id="progressBar" value="0" max="100" style="width: 100%;"></progress>
                
                <div style="margin-top: 10px; text-align: center;">
                    <button id="cancelGenerationButton" style="padding: 5px 10px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;
        
        // Add the dialog to the document BEFORE trying to access its elements
        document.body.appendChild(settingsDialog);
        
        // Set up event listeners for advanced mode toggle now that the element exists
        setupAdvancedModeToggle();
        
        // Set up progress controls now that the elements exist
        setupProgressControls();
    }
    
    // Set up advanced mode toggle
    function setupAdvancedModeToggle() {
        const advancedModeToggle = document.getElementById('advancedModeToggle');
        const advancedSettings = document.getElementById('advancedSettings');
        
        if (advancedModeToggle && advancedSettings) {
            advancedModeToggle.addEventListener('change', function() {
                isAdvancedMode = this.checked;
                advancedSettings.style.display = isAdvancedMode ? 'block' : 'none';
            });
        } else {
            Logger.warn('Advanced mode toggle elements not found');
        }
    }
    
    // Set up progress control buttons
    function setupProgressControls() {
        try {
            progressBar = document.getElementById('progressBar');
            progressText = document.getElementById('progressText');
            progressContainer = document.getElementById('progressContainer');
            const progressDetails = document.getElementById('progressDetails');
            
            // Set up cancel generation button
            const cancelGenerationButton = document.getElementById('cancelGenerationButton');
            if (cancelGenerationButton) {
                cancelGenerationButton.addEventListener('click', function() {
                    resetDialogToSettingsMode();
                });
            }
            
            if (!progressBar || !progressText || !progressContainer) {
                Logger.warn('Some progress control elements were not found');
            }
        } catch (error) {
            Logger.error('Error setting up progress controls:', error);
        }
    }
    
    // Generate theme options for selector
    function generateThemeOptions() {
        // Default themes if ThemeManager is not available
        const defaultThemes = ['light', 'dark'];
        
        // Get available themes from ThemeManager if available
        const themes = (typeof ThemeManager !== 'undefined' && ThemeManager.getAvailableThemes) ? 
            ThemeManager.getAvailableThemes() : defaultThemes;
        
        return themes.map(theme => 
            `<option value="${theme}">${theme.charAt(0).toUpperCase() + theme.slice(1)}</option>`
        ).join('');
    }
    
    // Create the PDF button
    function createPrintButton() {
        printButton = document.createElement('button');
        printButton.className = 'pdf-button';
        printButton.innerHTML = '<span>Generate PDF</span>';
        
        // Add to the sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Create a container for the button that will be positioned at the bottom
            const container = document.createElement('div');
            container.className = 'pdf-button-container';
            
            // Style container to position at bottom of sidebar
            Object.assign(container.style, {
                position: 'fixed',
                bottom: '20px',
                left: '0',
                width: '300px', // Match sidebar width
                padding: '10px 15px',
                textAlign: 'right',
                zIndex: '10',
                boxSizing: 'border-box'
            });
            
            // Style the button
            Object.assign(printButton.style, {
                padding: '8px 12px',
                fontSize: '13px',
                backgroundColor: '#42b983',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                display: 'inline-block'
            });
            
            container.appendChild(printButton);
            document.body.appendChild(container);
            
            // Ensure it's only visible when sidebar is open
            adjustButtonPosition();
            
            Logger.debug('PDF button added to sidebar bottom right');
        } else {
            // Fallback to fixed position if no sidebar
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
                zIndex: '100',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            });
            
            document.body.appendChild(printButton);
            Logger.debug('PDF button added to body (fallback)');
        }
    }
    
    // Adjust button position based on sidebar state
    function adjustButtonPosition() {
        const container = document.querySelector('.pdf-button-container');
        if (!container) return;

        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        
        // Get sidebar width and adjust container width to match
        const sidebarRect = sidebar.getBoundingClientRect();
        container.style.width = `${sidebarRect.width}px`;
        
        // Show/hide based on sidebar visibility
        const isSidebarClosed = document.body.classList.contains('close');
        container.style.display = isSidebarClosed ? 'none' : 'block';
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Cancel button
        const cancelButton = document.getElementById('cancelButton');
        if (cancelButton) {
            cancelButton.addEventListener('click', closeSettingsDialog);
        } else {
            Logger.warn('Cancel button not found');
        }
        
        // Generate button
        const generateButton = document.getElementById('generateButton');
        if (generateButton) {
            generateButton.addEventListener('click', function(e) {
                e.preventDefault();
                startPdfGeneration();
            });
        } else {
            Logger.warn('Generate button not found');
        }
        
        // PDF button
        if (printButton) {
            printButton.addEventListener('click', showSettingsDialog);
        } else {
            Logger.warn('Print button not found');
        }
        
        // Handle window resize to reposition button
        window.addEventListener('resize', adjustButtonPosition);
        
        // Listen for sidebar toggle events
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function() {
                // Use setTimeout to make sure class changes happen first
                setTimeout(adjustButtonPosition, 50);
            });
        }
        
        // Monitor for sidebar class changes (for other ways the sidebar might be toggled)
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.target.classList && 
                    (mutation.oldValue || '').includes('close') !== 
                    mutation.target.classList.contains('close')) {
                    adjustButtonPosition();
                }
            });
        });
        
        // Start observing the body for class changes
        if (document.body) {
            observer.observe(document.body, { 
                attributes: true, 
                attributeFilter: ['class'],
                attributeOldValue: true
            });
        }
    }
    
    // Show settings dialog
    function showSettingsDialog() {
        // Create overlay
        createOverlay();
        
        // Show dialog
        if (settingsDialog) {
            settingsDialog.style.display = 'block';
        } else {
            Logger.error('Settings dialog not found');
        }
    }
    
    // Close settings dialog
    function closeSettingsDialog() {
        // Remove overlay
        removeOverlay();
        
        // Hide dialog
        if (settingsDialog) {
            settingsDialog.style.display = 'none';
        }
    }
    
    // Start PDF generation
    function startPdfGeneration() {
        try {
            // Check if settings dialog exists
            if (!settingsDialog) {
                Logger.error('Settings dialog not found');
                return;
            }
            
            // Check if PDFGenerator exists
            if (typeof PDFGenerator === 'undefined' || typeof PDFGenerator.generatePDF !== 'function') {
                showErrorMessage('PDF Generator module not loaded');
                return;
            }
            
            // Get options from form
            const options = getOptions();
            
            // Show progress container
            if (progressContainer) {
                // Hide generate/cancel buttons
                const buttonsContainer = settingsDialog.querySelector('div[style*="justify-content: space-between"]');
                if (buttonsContainer) {
                    buttonsContainer.style.display = 'none';
                }
                
                // Show progress
                progressContainer.style.display = 'block';
                
                // Update progress bar
                updateProgress(5, 'Starting PDF generation...', 'Initializing');
            }
            
            // Start PDF generation
            Logger.info('Starting PDF generation with options:', options);
            PDFGenerator.generatePDF(options);
            
        } catch (error) {
            Logger.error('Error generating PDF:', error);
            showErrorMessage('Error generating PDF: ' + error.message);
            resetDialogToSettingsMode();
        }
    }
    
    // Debug PDF generation
    function debugPdfGeneration() {
        // Get options from form
        const options = getOptions();
        
        // Call debug function
        PDFGenerator.debugPDF(options);
        
        // Close dialog
        closeSettingsDialog();
    }
    
    // Show temporary error message
    function showErrorMessage(message, duration = 5000) {
        // Create error message element
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: fixed; 
            top: 20px; 
            left: 50%; 
            transform: translateX(-50%); 
            background-color: #f44336; 
            color: white; 
            padding: 10px 20px; 
            border-radius: 4px; 
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        errorMessage.textContent = message;
        
        // Add to document
        document.body.appendChild(errorMessage);
        
        // Remove after duration
        setTimeout(() => {
            if (errorMessage.parentNode) {
                errorMessage.parentNode.removeChild(errorMessage);
            }
        }, duration);
    }
    
    // Create semi-transparent overlay
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'pdf-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 499;
        `;
        
        // Add to document
        document.body.appendChild(overlay);
        
        // Close dialog when clicking overlay
        overlay.addEventListener('click', closeSettingsDialog);
    }
    
    // Remove overlay
    function removeOverlay() {
        const overlay = document.getElementById('pdf-overlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }
    
    // Get all options from form fields
    function getOptions() {
        try {
            // Basic settings (always included)
            const options = {
                paperSize: document.getElementById('paperSize')?.value || 'a4',
                orientation: document.getElementById('orientation')?.value || 'portrait',
                margins: document.getElementById('margins')?.value || '10',
                theme: document.getElementById('theme')?.value || 'light',
                imageQuality: document.getElementById('imageQuality')?.value || 'medium',
                
                // Default values for advanced settings
                includeImages: true,
                includeTables: true,
                includeCode: true,
                respectPageBreaks: true,
                svgHandling: 'vector',
                imageFormat: 'JPEG',
                pdfVersion: '1.4'
            };
            
            // Add advanced settings only if in advanced mode
            if (isAdvancedMode) {
                options.includeImages = document.getElementById('includeImages')?.checked ?? true;
                options.includeTables = document.getElementById('includeTables')?.checked ?? true;
                options.includeCode = document.getElementById('includeCode')?.checked ?? true; 
                options.respectPageBreaks = document.getElementById('respectPageBreaks')?.checked ?? true;
                options.svgHandling = document.getElementById('svgHandling')?.value || 'vector';
                options.imageFormat = document.getElementById('imageFormat')?.value || 'JPEG';
                options.pdfVersion = document.getElementById('pdfVersion')?.value || '1.4';
            }
            
            // Explicitly set UTF-8 and emoji support to false
            options.unicodeFonts = false;
            options.emojiHandling = 'strip';
            
            return options;
        } catch (error) {
            Logger.error('Error getting options:', error);
            return {
                paperSize: 'a4',
                orientation: 'portrait',
                margins: '10',
                theme: 'light',
                imageQuality: 'medium',
                includeImages: true,
                includeTables: true,
                includeCode: true,
                respectPageBreaks: true,
                svgHandling: 'vector',
                imageFormat: 'JPEG',
                pdfVersion: '1.4',
                unicodeFonts: false,
                emojiHandling: 'strip'
            };
        }
    }
    
    // Reset dialog to settings mode
    function resetDialogToSettingsMode() {
        if (!settingsDialog) return;
        
        // Hide progress
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // Show buttons
        const buttonsContainer = settingsDialog.querySelector('div[style*="justify-content: space-between"]');
        if (buttonsContainer) {
            buttonsContainer.style.display = 'flex';
        }
        
        // Reset progress
        updateProgress(0, '', '');
    }
    
    // Update progress bar and text
    function updateProgress(value, text, details) {
        try {
            if (progressBar) {
                progressBar.value = value;
            }
            
            if (progressText) {
                progressText.textContent = text || '';
            }
            
            // Update details if provided
            const progressDetails = document.getElementById('progressDetails');
            if (progressDetails && details) {
                progressDetails.textContent = details;
            }
        } catch (error) {
            Logger.error('Error updating progress:', error);
        }
    }
    
    return {
        initialize,
        updateProgress,
        adjustButtonPosition
    };
})();
