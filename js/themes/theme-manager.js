/**
 * Theme Manager for Docsify PDF Generator
 * Handles theme loading, switching, and application
 */
const ThemeManager = (function() {
    // Current theme and available themes
    let currentTheme = 'light';
    const themes = {
        'light': LightTheme,
        'dark': DarkTheme
    };
    
    // Initialize with default or saved theme
    function initialize() {
        const savedTheme = localStorage.getItem('docsify-pdf-theme');
        if (savedTheme && themes[savedTheme]) {
            currentTheme = savedTheme;
            Logger.debug(`Loaded saved theme preference: ${currentTheme}`);
        }
        
        return getCurrentTheme();
    }
    
    // Core theme functions
    function getCurrentTheme() { return themes[currentTheme]; }
    
    function setTheme(themeName) {
        if (!themes[themeName]) {
            Logger.warn(`Theme '${themeName}' not found. Using default.`);
            themeName = 'light';
        }
        
        currentTheme = themeName;
        localStorage.setItem('docsify-pdf-theme', themeName);
        Logger.debug(`Theme set to: ${themeName}`);
        
        return getCurrentTheme();
    }
    
    function getAvailableThemes() { return Object.keys(themes); }
    
    function registerTheme(name, themeObject) {
        if (themes[name]) {
            Logger.warn(`Theme '${name}' already exists and will be overwritten.`);
        }
        themes[name] = themeObject;
        Logger.debug(`Registered new theme: ${name}`);
    }
    
    // Apply theme to PDF document
    function applyThemeToPdf(doc, theme = null) {
        const themeSettings = theme || getCurrentTheme();
        
        // Store theme settings on document
        doc.__currentTheme = themeSettings;
        doc.__themeTextColor = themeSettings.text.color;
        doc.__themeHeadingColor = themeSettings.text.headingColor || themeSettings.text.color;
        doc.__themeName = themeSettings.name;
        doc.__isDarkTheme = themeSettings.page.backgroundColor !== 'transparent';
        
        // Apply theme to document
        applyBackgroundToAllPages(doc, themeSettings);
        setThemeTextColor(doc, themeSettings.text.color);
        
        // Set up handlers for PDF operations
        wrapPdfMethods(doc, themeSettings);
        
        return doc;
    }
    
    // Wrapper for all PDF method modifications
    function wrapPdfMethods(doc, themeSettings) {
        wrapDrawingMethods(doc, themeSettings);
        wrapTextColorMethod(doc, themeSettings);
        wrapSetFontMethod(doc, themeSettings);
        wrapAddPageMethod(doc, themeSettings);
    }
    
    // Wrap drawing methods to preserve text color
    function wrapDrawingMethods(doc, themeSettings) {
        ['rect', 'line', 'ellipse', 'circle', 'triangle'].forEach(method => {
            const originalMethod = doc[method];
            if (typeof originalMethod === 'function') {
                doc[method] = function(...args) {
                    const result = originalMethod.apply(this, args);
                    
                    // Restore text color after drawing in dark theme
                    if (themeSettings.page.backgroundColor !== 'transparent') {
                        setThemeTextColor(this, themeSettings.text.color);
                    }
                    
                    return result;
                };
            }
        });
    }
    
    // Wrap text color method to handle dark theme
    function wrapTextColorMethod(doc, themeSettings) {
        const originalSetTextColor = doc.setTextColor;
        
        // Add tracking variables
        doc.__usingSpecialColor = false;
        doc.__lastTextColor = themeSettings.text.color;
        
        doc.setTextColor = function(...args) {
            // Handle theme-specific commands
            if (args.length === 1 && typeof args[0] === 'string') {
                switch(args[0]) {
                    case 'theme:text':
                        originalSetTextColor.call(this, ...themeSettings.text.color);
                        doc.__lastTextColor = themeSettings.text.color;
                        doc.__usingSpecialColor = false;
                        return this;
                        
                    case 'theme:heading':
                        const headingColor = themeSettings.text.headingColor || themeSettings.text.color;
                        originalSetTextColor.call(this, ...headingColor);
                        doc.__lastTextColor = headingColor;
                        doc.__usingSpecialColor = false;
                        return this;
                        
                    case 'theme:restore':
                        originalSetTextColor.call(this, ...doc.__lastTextColor);
                        doc.__usingSpecialColor = false;
                        return this;
                }
            }
            
            // Prevent black text on dark background
            if (themeSettings.page.backgroundColor !== 'transparent' && 
                args.length === 3 && args[0] === 0 && args[1] === 0 && args[2] === 0) {
                Logger.debug('Prevented black text on dark background, using theme color instead');
                originalSetTextColor.call(this, ...themeSettings.text.color);
                doc.__lastTextColor = themeSettings.text.color;
                doc.__usingSpecialColor = false;
                return this;
            }
            
            // Standard color setting
            doc.__usingSpecialColor = true;
            doc.__lastTextColor = args.length === 3 ? [args[0], args[1], args[2]] : args[0];
            return originalSetTextColor.apply(this, args);
        };
    }
    
    // Wrap font setting method
    function wrapSetFontMethod(doc, themeSettings) {
        const originalSetFont = doc.setFont;
        
        doc.setFont = function(fontName, fontStyle) {
            // Call original method
            originalSetFont.call(this, fontName, fontStyle);
            
            // Reset text color after font change if not using special color
            if (!doc.__usingSpecialColor) {
                setThemeTextColor(this, themeSettings.text.color);
            }
            
            return this;
        };
    }
    
    // Wrap addPage method
    function wrapAddPageMethod(doc, themeSettings) {
        if (themeSettings.page.backgroundColor === 'transparent') return;
        
        const originalAddPage = doc.addPage;
        
        doc.addPage = function(...args) {
            const result = originalAddPage.apply(this, args);
            applyBackgroundToCurrentPage(doc, themeSettings);
            setThemeTextColor(this, themeSettings.text.color);
            return result;
        };
    }
    
    // Helper to set text color consistently
    function setThemeTextColor(doc, color) {
        doc.setTextColor(color[0], color[1], color[2]);
    }
    
    // Apply background to all pages
    function applyBackgroundToAllPages(doc, themeSettings) {
        if (themeSettings.page.backgroundColor === 'transparent') return;
        
        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;
        const totalPages = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            applyBackgroundToCurrentPage(doc, themeSettings);
        }
        
        doc.setPage(currentPage);
    }
    
    // Apply background to current page
    function applyBackgroundToCurrentPage(doc, themeSettings) {
        if (themeSettings.page.backgroundColor === 'transparent') return;
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        try {
            doc.saveGraphicsState();
            
            // Apply background color
            const bgColor = themeSettings.page.backgroundColor;
            doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            
            // Mark background in output for debugging
            doc.comment('BEGIN BACKGROUND RECT');
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            doc.comment('END BACKGROUND RECT');
            
            doc.restoreGraphicsState();
            setThemeTextColor(doc, themeSettings.text.color);
        } catch (error) {
            Logger.error("Error applying background", error);
            
            // Fallback direct approach without graphics state
            const bgColor = themeSettings.page.backgroundColor;
            doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            setThemeTextColor(doc, themeSettings.text.color);
        }
    }
    
    // Finalize theme application before saving
    function finalizeThemeApplication(doc) {
        const themeSettings = getCurrentTheme();
        
        // Ensure all pages have the correct background
        applyBackgroundToAllPages(doc, themeSettings);
        
        // Force text color to be correct on all pages
        const textColor = themeSettings.text.color;
        const totalPages = doc.internal.getNumberOfPages();
        
        // For dark theme, verify text color on all pages
        if (themeSettings.page.backgroundColor !== 'transparent') {
            Logger.debug(`Finalizing dark theme across ${totalPages} pages`);
            
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.comment(`DARK THEME TEXT COLOR RESET - PAGE ${i}`);
                setThemeTextColor(doc, textColor);
            }
        }
        
        // Return to first page
        doc.setPage(1);
        setThemeTextColor(doc, textColor);
        
        return doc;
    }

    return {
        initialize,
        getCurrentTheme,
        setTheme,
        getAvailableThemes,
        registerTheme,
        applyThemeToPdf,
        finalizeThemeApplication
    };
})();
