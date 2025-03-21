/**
 * SVG2PDF Bridge - ensures compatibility between different versions 
 * of svg2pdf.js and jsPDF - with reduced conflicts
 */
(function() {
    // Prevent multiple initializations
    if (window._svg2pdfBridgeInitialized) {
        console.log('SVG2PDF Bridge already initialized, skipping');
        return;
    }
    
    // Check if we should initialize the bridge
    if (typeof window.svg2pdf !== 'function') {
        console.log('svg2pdf not available, bridge not needed yet');
        return;
    }
    
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        // Wait for jsPDF
        const waitInterval = setInterval(() => {
            if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                clearInterval(waitInterval);
                setupBridge();
            }
        }, 100);
        
        // Give up after 3 seconds
        setTimeout(() => clearInterval(waitInterval), 3000);
        return;
    }
    
    // Setup the bridge if both libraries are available
    setupBridge();
    
    function setupBridge() {
        console.log('Setting up svg2pdf bridge');
        
        // Only if jsPDF is available and svg() method isn't already defined
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            console.warn('jsPDF not available, bridge not initialized');
            return;
        }
        
        const jsPDF = window.jspdf.jsPDF;
        
        // Skip if svg method already exists
        if (typeof jsPDF.prototype.svg === 'function') {
            console.log('jsPDF already has svg() method, bridge not needed');
            return;
        }
        
        // Add svg method to jsPDF prototype
        jsPDF.prototype.svg = function(element, options = {}) {
            // Extract options with defaults
            const opts = {
                x: options.x || 0,
                y: options.y || 0,
                width: options.width || undefined, 
                height: options.height || undefined
            };
            
            // Return Promise for consistent API
            return new Promise((resolve, reject) => {
                try {
                    // Use the global svg2pdf function
                    const result = window.svg2pdf(element, this, opts);
                    
                    // For promise-based versions of svg2pdf
                    if (result && typeof result.then === 'function') {
                        result.then(() => resolve(this)).catch(reject);
                        return;
                    }
                    
                    // For synchronous versions of svg2pdf
                    resolve(this);
                } catch (error) {
                    console.error('Error in svg() bridge method:', error);
                    reject(error);
                }
            });
        };
        
        console.log('svg() method added to jsPDF');
        
        // Mark as initialized to prevent duplicates
        window._svg2pdfBridgeInitialized = true;
    }
})();
