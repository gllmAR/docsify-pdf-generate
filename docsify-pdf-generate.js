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
    const loadedModules = { utils: {}, modules: {} };
    
    // Module paths configuration
    const modulesPath = {
        utils: [
            'js/utils/logger.js',
            'js/utils/dependencies.js',
            'js/utils/latex-parser.js',
            'js/utils/html-parser.js', 
            'js/utils/svg2pdf-bridge.js',
            'js/utils/jspdf-svg-plugin.js',
            'js/utils/svg2pdf-fallback.js',
            'js/utils/link-utils.js'
        ],
        themes: [
            'js/themes/light-theme.js',
            'js/themes/dark-theme.js',
            'js/themes/theme-manager.js'
        ],
        modules: [
            'js/modules/markdown-parser.js',
            'js/modules/image-processor.js',
            'js/modules/svg-handler.js',
            'js/modules/table-renderer.js',
            'js/modules/element-renderer.js',
            'js/modules/pdf-generator.js',
            'js/modules/ui.js'
        ],
        main: 'js/main.js'
    };
    
    // Get base path for module loading
    const basePath = getBasePath();
    
    // Initialize when the page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Main initialization function
    function init() {
        embedStyles();
        initializeApp();
        
        // Fallback initialization
        window.addEventListener('load', function() {
            setTimeout(function() {
                if (typeof UIManager?.initialize === 'function' && 
                    !document.querySelector('.pdf-button')) {
                    console.log('Fallback UI initialization...');
                    UIManager.initialize();
                }
            }, 1000);
        });
    }
    
    // Get the path where this script is located
    function getBasePath() {
        const scripts = document.getElementsByTagName('script');
        const currentScript = scripts[scripts.length - 1];
        const currentPath = currentScript.src || '';
        
        // Handle CDN loading
        if (currentPath.includes('cdn.jsdelivr.net') || 
            currentPath.includes('unpkg.com') || 
            currentPath.includes('cdnjs.cloudflare.com')) {
            
            const pathParts = currentPath.split('/');
            pathParts.pop();
            return pathParts.join('/') + '/';
        }
        
        // Handle local path
        const path = currentPath.split('/');
        path.pop();
        return path.join('/') + '/';
    }
    
    // Load application modules sequentially
    function initializeApp() {
        console.log('Initializing Docsify PDF Generator...');
        
        // Load modules in sequence: utils → themes → modules → main
        loadSequentially(
            modulesPath.utils, 
            () => loadSequentially(
                modulesPath.themes,
                () => loadSequentially(
                    modulesPath.modules, 
                    () => loadScript(
                        basePath + modulesPath.main,
                        () => {
                            console.log('Docsify PDF Generator initialized successfully');
                            if (typeof UIManager?.initialize === 'function') {
                                console.log('Initializing UI components...');
                                UIManager.initialize();
                            } else {
                                console.error('UIManager not available, PDF button will not be created');
                            }
                        },
                        () => console.error('Failed to load main script')
                    ),
                    basePath
                ),
                basePath
            ),
            basePath
        );
    }
    
    // Load a script and execute callback when loaded
    function loadScript(url, callback, errorCallback) {
        const script = document.createElement('script');
        script.async = true;
        script.src = url;
        
        script.onload = () => callback(url);
        script.onerror = () => {
            console.error(`Failed to load: ${url}`);
            if (errorCallback) errorCallback(url);
        };
        
        document.head.appendChild(script);
    }
    
    // Load a group of scripts sequentially
    function loadSequentially(scripts, callback, prefix = '') {
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
                console.warn(`Skipping: ${nextScript} due to load error`);
                loadSequentially(remainingScripts, callback, prefix);
            }
        );
    }
    
    // Embed CSS for the PDF button and UI elements
    function embedStyles() {
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
                z-index: 3;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                user-select: none;
            }
            
            @media print {
                .pdf-button { display: none; }
            }
            
            #progressContainer { margin-top: 10px; }
            
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
            
            #pdfSettingsDialog {
                z-index: 400;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
})();
