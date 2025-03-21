/**
 * Main entry point for Docsify PDF Generator
 */
(function() {
    // Initialize the application once Docsify is ready
    window.$docsify.plugins = [].concat(function(hook, vm) {
        hook.mounted(async function() {
            try {
                Logger.info('Initializing Docsify PDF Generator...');
                
                // Wait a short time to ensure all modules are loaded before initializing UI
                setTimeout(() => {
                    // Initialize UI with a slight delay to ensure all modules are loaded
                    if (typeof UIManager !== 'undefined' && typeof UIManager.initialize === 'function') {
                        Logger.info('Initializing UI...');
                        UIManager.initialize();
                        
                        // Verify the button was created
                        setTimeout(() => {
                            if (!document.querySelector('.pdf-button')) {
                                Logger.warn('PDF button not found, re-initializing UI...');
                                UIManager.initialize(); // Try again
                            }
                        }, 500);
                    } else {
                        Logger.error('UIManager not available!');
                    }
                    
                    // Verify all dependencies are available
                    if (typeof PDFGenerator === 'undefined') {
                        Logger.error('PDFGenerator module not loaded correctly!');
                    }
                    if (typeof TableRendererModule === 'undefined') {
                        Logger.error('TableRendererModule not loaded correctly!');
                    }
                    if (typeof ElementRendererModule === 'undefined') {
                        Logger.error('ElementRendererModule not loaded correctly!');
                    }
                }, 200);
                
                // Pre-load dependencies in the background for faster PDF generation later
                DependencyLoader.loadAllDependencies().then(result => {
                    Logger.info('Dependencies loaded successfully:', result);
                    
                    if (result.svg2pdfNative === false) {
                        // If we're using the fallback, show a subtle notification to the user
                        const notification = document.createElement('div');
                        notification.style.position = 'fixed';
                        notification.style.bottom = '60px';
                        notification.style.right = '20px';
                        notification.style.padding = '8px 12px';
                        notification.style.background = '#fffbe6';
                        notification.style.border = '1px solid #ffe58f';
                        notification.style.borderRadius = '4px';
                        notification.style.fontSize = '12px';
                        notification.style.zIndex = '100';
                        notification.style.maxWidth = '300px';
                        notification.innerHTML = 'Using SVG fallback rendering - vector quality may be reduced';
                        
                        // Auto-hide after 5 seconds
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.parentNode.removeChild(notification);
                            }
                        }, 5000);
                        
                        document.body.appendChild(notification);
                    }
                }).catch(error => {
                    Logger.error('Failed to load dependencies:', error);
                    
                    // Show error to user
                    const errorNotification = document.createElement('div');
                    errorNotification.style.position = 'fixed';
                    errorNotification.style.bottom = '60px';
                    errorNotification.style.right = '20px';
                    errorNotification.style.padding = '8px 12px';
                    errorNotification.style.background = '#fff2f0';
                    errorNotification.style.border = '1px solid #ffccc7';
                    errorNotification.style.borderRadius = '4px';
                    errorNotification.style.fontSize = '12px';
                    errorNotification.style.zIndex = '100';
                    errorNotification.style.maxWidth = '300px';
                    errorNotification.innerHTML = 'PDF generation may not work properly - error loading dependencies';
                    
                    document.body.appendChild(errorNotification);
                });
            } catch (error) {
                Logger.error('Error during initialization:', error);
            }
        });
    }, window.$docsify.plugins);
    
    // Add global access to reinitialize UI if needed
    window.reinitDocsifyPDF = function() {
        if (typeof UIManager !== 'undefined') {
            UIManager.initialize();
            return true;
        }
        return false;
    };
})();
