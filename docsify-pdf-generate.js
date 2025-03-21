/**
 * Docsify PDF Generator - Entry Point
 * 
 * This script loads all required modules and utilities for the PDF generator.
 * Include this single script in your Docsify project to enable PDF generation.
 * 
 * Usage:
 * <script src="https://cdn.jsdelivr.net/gh/gllmAR/docsify-pdf-generate/docsify-pdf-generate.js"></script>
 */
(function() {
    // Track loaded modules
    const loadedModules = {
        utils: {},
        modules: {}
    };
    
    // Get base path where the script is located
    const getBasePath = () => {
        const scripts = document.getElementsByTagName('script');
        const currentScript = scripts[scripts.length - 1];
        const currentPath = currentScript.src || '';
        
        // Check if loaded from a CDN
        if (currentPath.includes('cdn.jsdelivr.net') || 
            currentPath.includes('unpkg.com') || 
            currentPath.includes('cdnjs.cloudflare.com')) {
            
            // Extract the base path from CDN URL
            const pathParts = currentPath.split('/');
            pathParts.pop(); // Remove the current script name
            return pathParts.join('/') + '/';
        }
        
        // Get local path
        const path = currentPath.split('/');
        path.pop(); // Remove the current script name
        return path.join('/') + '/';
    };
    
    const basePath = getBasePath();
    const modulesPath = {
        utils: [
            'js/utils/logger.js',
            'js/utils/dependencies.js',
            'js/utils/svg2pdf-bridge.js', // Add the bridge before other SVG utilities
            'js/utils/jspdf-svg-plugin.js',
            'js/utils/svg2pdf-fallback.js',
            'js/utils/link-utils.js'  // Add this before modules that depend on it
        ],
        modules: [
            'js/modules/markdown-parser.js',
            'js/modules/image-processor.js',
            'js/modules/svg-handler.js',
            'js/modules/table-renderer.js', // Make sure table renderer comes before PDF generator
            'js/modules/element-renderer.js', // And element renderer before PDF generator
            'js/modules/pdf-generator.js',
            'js/modules/ui.js'  // Move UI to the last position to ensure all other modules are loaded
        ],
        main: 'js/main.js'
    };
    
    // Load a script and execute callback when loaded
    const loadScript = (url, callback, errorCallback) => {
        const script = document.createElement('script');
        script.async = true;
        script.src = url;
        
        script.onload = () => {
            callback(url);
        };
        
        script.onerror = () => {
            console.error(`Failed to load: ${url}`);
            if (errorCallback) errorCallback(url);
        };
        
        document.head.appendChild(script);
    };
    
    // Load a group of scripts sequentially
    const loadSequentially = (scripts, callback, prefix = '') => {
        if (scripts.length === 0) {
            if (callback) callback();
            return;
        }
        
        const nextScript = scripts[0];
        const remainingScripts = scripts.slice(1);
        const fullPath = prefix + nextScript;
        
        loadScript(
            fullPath,
            () => {
                console.log(`Loaded: ${nextScript}`);
                loadedModules.utils[nextScript] = true;
                loadSequentially(remainingScripts, callback, prefix);
            },
            () => {
                // Continue even if a script fails to load
                console.warn(`Skipping: ${nextScript} due to load error`);
                loadSequentially(remainingScripts, callback, prefix);
            }
        );
    };
    
    // Initialize the application by loading all scripts
    const initializeApp = () => {
        console.log('Initializing Docsify PDF Generator...');
        
        // First load all utility scripts
        loadSequentially(
            modulesPath.utils, 
            () => {
                // Then load all module scripts
                loadSequentially(
                    modulesPath.modules, 
                    () => {
                        // Finally load the main entry point
                        loadScript(
                            basePath + modulesPath.main,
                            () => {
                                console.log('Docsify PDF Generator initialized successfully');
                                
                                // CRITICAL FIX: Explicitly initialize UI after all scripts are loaded
                                // This ensures the PDF button is created and visible
                                if (typeof UIManager !== 'undefined' && typeof UIManager.initialize === 'function') {
                                    console.log('Initializing UI components...');
                                    UIManager.initialize();
                                } else {
                                    console.error('UIManager not available, PDF button will not be created');
                                }
                            },
                            () => {
                                console.error('Failed to load main script');
                            }
                        );
                    },
                    basePath
                );
            },
            basePath
        );
    };
    
    // Embed CSS for the PDF button and UI elements
    const embedStyles = () => {
        const styles = `
            .pdf-button {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 8px 15px;
                background-color: #42b983;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                z-index: 100;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            
            @media print {
                .pdf-button {
                    display: none;
                }
            }
            
            #progressContainer {
                margin-top: 10px;
            }
            
            #progressBar {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 10px;
            }
            
            #progressBar::-webkit-progress-bar {
                background-color: #f0f0f0;
                border-radius: 5px;
            }
            
            #progressBar::-webkit-progress-value {
                background-color: #42b983;
                border-radius: 5px;
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    };
    
    // Initialize when the page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            embedStyles();
            initializeApp();
        });
    } else {
        embedStyles();
        initializeApp();
    }
    
    // Add a fallback initialization for the UI just in case
    window.addEventListener('load', function() {
        // Wait a bit to ensure all scripts are evaluated
        setTimeout(function() {
            if (typeof UIManager !== 'undefined' && typeof UIManager.initialize === 'function') {
                // Check if the button already exists
                if (!document.querySelector('.pdf-button')) {
                    console.log('Fallback UI initialization...');
                    UIManager.initialize();
                }
            }
        }, 1000);
    });
})();
