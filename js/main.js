/**
 * Main entry point for Docsify PDF Generator
 */
(function() {
    // Initialize the application once Docsify is ready
    window.$docsify.plugins = [].concat(function(hook, vm) {
        // Initialize on mounting
        hook.mounted(initializePlugin);
    }, window.$docsify.plugins);
    
    // Plugin initialization function
    function initializePlugin() {
        try {
            Logger.info('Initializing Docsify PDF Generator...');
            
            // Initialize UI with delay to ensure modules are loaded
            setTimeout(initializeUI, 200);
            
            // Pre-load dependencies for faster PDF generation
            loadDependencies();
        } catch (error) {
            Logger.error('Error during initialization:', error);
        }
    }
    
    // Initialize UI components
    function initializeUI() {
        if (typeof UIManager?.initialize === 'function') {
            Logger.info('Initializing UI...');
            UIManager.initialize();
            
            // Verify button creation
            setTimeout(() => {
                if (!document.querySelector('.pdf-button')) {
                    Logger.warn('PDF button not found, re-initializing UI...');
                    UIManager.initialize();
                }
            }, 500);
        } else {
            Logger.error('UIManager not available!');
        }
        
        // Verify core modules
        const missingModules = [];
        if (typeof PDFGenerator === 'undefined') missingModules.push('PDFGenerator');
        if (typeof TableRendererModule === 'undefined') missingModules.push('TableRenderer');
        if (typeof ElementRendererModule === 'undefined') missingModules.push('ElementRenderer');
        
        if (missingModules.length > 0) {
            Logger.error(`Missing modules: ${missingModules.join(', ')}`);
        }
    }
    
    // Load dependencies and show appropriate notifications
    function loadDependencies() {
        DependencyLoader.loadAllDependencies()
            .then(result => {
                Logger.info('Dependencies loaded successfully:', result);
                
                if (result.svg2pdfNative === false) {
                    showNotification('Using SVG fallback rendering - vector quality may be reduced', 
                                     '#fffbe6', '#ffe58f');
                }
            })
            .catch(error => {
                Logger.error('Failed to load dependencies:', error);
                showNotification('PDF generation may not work properly - error loading dependencies',
                                 '#fff2f0', '#ffccc7');
            });
    }
    
    // Show temporary notification
    function showNotification(message, bgColor, borderColor, duration = 5000) {
        const notification = document.createElement('div');
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '60px',
            right: '20px',
            padding: '8px 12px',
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: '100',
            maxWidth: '300px'
        });
        notification.innerHTML = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }
    
    // Add global access to reinitialize UI if needed
    window.reinitDocsifyPDF = function() {
        return typeof UIManager !== 'undefined' ? (UIManager.initialize(), true) : false;
    };
})();
