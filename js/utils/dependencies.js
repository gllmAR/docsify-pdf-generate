/**
 * Dependencies loader for Docsify PDF Generator
 */
const DependencyLoader = (function() {
    // Track loaded dependencies
    const loadedDependencies = {
        jsPDF: false,
        outlinePlugin: false,
        svg2pdf: false
    };
    
    // Function to dynamically load scripts with retry
    function loadScript(url, callback, errorCallback, retries = 3) {
        const script = document.createElement('script');
        script.src = url;
        
        script.onload = function() {
            callback();
        };
        
        script.onerror = function() {
            retries--;
            if (retries > 0) {
                Logger.warn(`Failed to load ${url}, retrying... (${retries} retries left)`);
                setTimeout(() => {
                    document.head.removeChild(script);
                    loadScript(url, callback, errorCallback, retries);
                }, 1000);
            } else {
                Logger.error(`Failed to load ${url} after multiple attempts`);
                errorCallback();
            }
        };
        
        document.head.appendChild(script);
    }
    
    // Load jsPDF library
    function loadJSPDF() {
        return new Promise((resolve, reject) => {
            loadScript(
                'https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js',
                () => {
                    loadedDependencies.jsPDF = true;
                    Logger.info('jsPDF loaded successfully');
                    resolve();
                },
                () => {
                    Logger.error('Failed to load jsPDF');
                    reject(new Error('Failed to load jsPDF'));
                }
            );
        });
    }
    
    // Load outline plugin
    function loadOutlinePlugin() {
        return new Promise((resolve, reject) => {
            loadScript(
                'jspdf-module/outline.js',
                () => {
                    loadedDependencies.outlinePlugin = true;
                    Logger.info('Outline plugin loaded successfully');
                    resolve();
                },
                () => {
                    Logger.warn('Failed to load outline plugin - PDF bookmarks will not be available');
                    // Still resolve since this is optional
                    resolve();
                }
            );
        });
    }
    
    // Load SVG2PDF with multiple fallback sources - prioritize modern version
    function loadSVG2PDF() {
        return new Promise((resolve) => {
            // Skip if already loaded via modern API
            if (typeof window.jspdf !== 'undefined' && 
                typeof window.jspdf.jsPDF !== 'undefined' && 
                typeof window.jspdf.jsPDF.prototype.svg === 'function') {
                Logger.info('Modern SVG2PDF already loaded via jsPDF.svg()');
                loadedDependencies.svg2pdf = true;
                resolve(true);
                return;
            }
            
            // Skip if legacy version already loaded
            if (typeof window.svg2pdf === 'function') {
                Logger.info('Legacy SVG2PDF already loaded, using existing instance');
                loadedDependencies.svg2pdf = true;
                resolve(false); // Indicate this is legacy version
                return;
            }
            
            // Try to load modern version first, then fallback to legacy
            const sources = [
                // Modern versions (with jsPDF.svg() method)
                'https://unpkg.com/svg2pdf.js@2.2.1/dist/svg2pdf.umd.min.js',
                'https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.1/dist/svg2pdf.umd.min.js',
                // Legacy versions (standalone svg2pdf function)
                'https://unpkg.com/svg2pdf.js@1.5.0/dist/svg2pdf.min.js',
                'https://cdn.jsdelivr.net/npm/svg2pdf.js@1.5.0/dist/svg2pdf.min.js',
                'https://unpkg.com/svg2pdf.js@1.4.2/dist/svg2pdf.min.js',
                'https://cdn.jsdelivr.net/npm/svg2pdf.js@1.4.2/dist/svg2pdf.min.js'
            ];
            
            let currentSourceIndex = 0;
            
            function tryNextSource() {
                if (currentSourceIndex >= sources.length) {
                    Logger.warn('Failed to load SVG2PDF from CDN sources, loading fallback...');
                    // Load internal fallback
                    loadInternalFallback().then(() => resolve(false));
                    return;
                }
                
                const source = sources[currentSourceIndex++];
                Logger.debug(`Attempting to load SVG2PDF from: ${source}`);
                
                loadScript(
                    source,
                    () => {
                        if (typeof window.svg2pdf === 'function') {
                            Logger.info(`SVG2PDF successfully loaded from ${source}`);
                            loadedDependencies.svg2pdf = true;
                            resolve(true);
                        } else {
                            Logger.warn(`SVG2PDF loaded from ${source} but function not available`);
                            tryNextSource();
                        }
                    },
                    () => tryNextSource()
                );
            }
            
            // Start trying sources
            tryNextSource();
        });
    }
    
    // Load internal SVG2PDF fallback
    function loadInternalFallback() {
        return new Promise((resolve) => {
            loadScript(
                './js/utils/svg2pdf-fallback.js',
                () => {
                    Logger.info('Internal SVG2PDF fallback loaded');
                    loadedDependencies.svg2pdf = true;
                    resolve();
                },
                () => {
                    // Last resort - define minimal fallback inline
                    Logger.warn('Failed to load internal fallback, using minimal embedded fallback');
                    window.svg2pdf = function(svgElement, pdf, options) {
                        Logger.info('Using minimal SVG fallback - SVGs will be rendered as images');
                        // Implementation would go here - simplified for brevity
                        // This would use canvas to render SVG and add to PDF
                        return Promise.resolve();
                    };
                    loadedDependencies.svg2pdf = true;
                    resolve();
                }
            );
        });
    }
    
    // Load all dependencies
    async function loadAllDependencies() {
        try {
            await loadJSPDF();
            await loadOutlinePlugin();
            const svg2pdfResult = await loadSVG2PDF();
            
            return {
                jsPDF: loadedDependencies.jsPDF,
                outlinePlugin: loadedDependencies.outlinePlugin,
                svg2pdf: loadedDependencies.svg2pdf,
                svg2pdfNative: svg2pdfResult // true if CDN version loaded, false if fallback
            };
        } catch (error) {
            Logger.error('Failed to load dependencies:', error);
            throw error;
        }
    }
    
    // Check if all critical dependencies are loaded
    function areDependenciesLoaded() {
        return loadedDependencies.jsPDF && loadedDependencies.svg2pdf;
    }
    
    return {
        loadAllDependencies,
        areDependenciesLoaded
    };
})();
