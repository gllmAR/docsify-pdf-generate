/**
 * PDF Generator module for Docsify PDF Generator
 */
const PDFGenerator = (function() {
    // Import sub-modules - initialize these lazily when first used
    let TableRenderer;
    let ElementRenderer;
    
    // Initialize dependencies when needed
    function initializeDependencies() {
        // Check if dependencies are already initialized
        if (TableRenderer && ElementRenderer) return;
        
        // Get the dependencies from the global scope
        if (typeof TableRendererModule !== 'undefined') {
            TableRenderer = TableRendererModule;
        } else {
            console.error('TableRendererModule not available');
            // Provide fallback
            TableRenderer = { renderTable: () => Promise.resolve({ yPosition: 0, currentPage: 1 }) };
        }
        
        if (typeof ElementRendererModule !== 'undefined') {
            ElementRenderer = ElementRendererModule;
        } else {
            console.error('ElementRendererModule not available');
            // Provide fallback
            ElementRenderer = { 
                initializeOutlineStructure: (doc) => ({}),
                renderTitlePage: () => {},
                isLayoutCommand: () => false,
                processLayoutCommand: () => ({}),
                renderElement: () => Promise.resolve({})
            };
        }
    }

    // Generate PDF from parsed content
    async function generatePDF(options, debug = false) {
        try {
            // Initialize dependencies now when they're needed
            initializeDependencies();
            
            // Ensure dependencies are loaded
            if (!DependencyLoader.areDependenciesLoaded()) {
                UIManager.updateProgress(5, 'Loading dependencies...', 'Fetching required libraries');
                await DependencyLoader.loadAllDependencies();
            }
            
            const { jsPDF } = window.jspdf;
            
            // Configure PDF with compatibility options
            const doc = new jsPDF({
                orientation: options.orientation,
                unit: 'mm',
                format: options.paperSize,
                compress: true,
                precision: 16,
                putOnlyUsedFonts: true,
                floatPrecision: 16,
                hotfixes: ["px_scaling"],
                fontFaces: [],
                useUnicode: false // Disable Unicode support
            });
            
            // Skip loading Unicode-compatible fonts - removed for simplicity
            
            // Initialize UTF-8 support - simple version only
            if (typeof UTF8Support !== 'undefined') {
                Logger.debug('Initializing basic text support');
                const utf8Initialized = UTF8Support.initialize(window.jspdf);
                if (!utf8Initialized) {
                    Logger.warn('Text support initialization had issues');
                }
            }
            
            // Add enhanced line drawing for strikethrough support
            enhanceStrikethroughSupport(doc);
            
            // Add basic character handling
            enhanceBasicTextSupport(doc);
            
            // Set PDF version for compatibility
            doc.internal.events.subscribe('putCatalog', function() {
                const pdfVersion = parseFloat(options.pdfVersion) || 1.4;
                this.internal.write("/Version /1." + Math.floor((pdfVersion * 10) % 10));
            });
            
            // Enable proper font embedding
            doc.setFont('Helvetica', 'normal', 'normal');
            
            // Set theme if available
            let isDarkTheme = false;
            if (typeof ThemeManager !== 'undefined') {
                // Apply selected theme
                if (options.theme) {
                    ThemeManager.setTheme(options.theme);
                }
                
                const currentTheme = ThemeManager.getCurrentTheme();
                
                // Determine if this is a dark theme
                isDarkTheme = currentTheme.page.backgroundColor !== 'transparent';
                
                if (isDarkTheme) {
                    Logger.info(`Using DARK theme with custom background: RGB(${currentTheme.page.backgroundColor.join(',')})`);
                    Logger.info(`Theme text FORCED to white: RGB(${currentTheme.text.color.join(',')})`);
                }
                
                // Apply theme to document
                ThemeManager.applyThemeToPdf(doc);
                
                // CRITICAL: Store is-dark flag directly on document for access in all methods
                doc.__isDarkTheme = isDarkTheme;
            }
            
            let content;
            try {
                content = await MarkdownParser.fetchMarkdownContent();
                UIManager.updateProgress(10, 'Content loaded, parsing...', 'Fetched Markdown content successfully');
            } catch (error) {
                Logger.error('Error fetching Markdown content:', error);
                UIManager.updateProgress(0, `Error: ${error.message}`, 'Failed to load document content');
                return;
            }
            
            const parsedContent = MarkdownParser.parseMarkdown(content);
            UIManager.updateProgress(20, 'Content parsed, processing elements...', 
                `Parsed ${parsedContent.length} document elements`);
            
            if (debug) {
                Logger.info("Parsed Content:", parsedContent);
                UIManager.updateProgress(100, 'Debug mode - content parsed but not rendered', 
                    'No PDF generated in debug mode');
                return;
            }

            // Set up PDF variables
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = parseFloat(options.margins);
            const contentWidth = pageWidth - (margin * 2);
            
            // Keep track of header IDs and their pages for internal linking
            const headerPageMap = new Map();
            
            let yPosition = margin;
            let currentPage = 1;

            // Create a title page if needed
            if (parsedContent.length > 0 && parsedContent[0].type === 'header' && parsedContent[0].level === 1) {
                ElementRenderer.renderTitlePage(doc, parsedContent[0], { pageWidth, pageHeight });
                doc.addPage();
                currentPage++;
                yPosition = margin;
            }
            
            // Create outline tracking
            const outlineEntries = ElementRenderer.initializeOutlineStructure(doc);
            
            // Process content elements
            let alignment = 'left'; // Default alignment
            
            // IMPORTANT: Ensure text color is correct before starting content rendering
            if (typeof ThemeManager !== 'undefined') {
                const textColor = ThemeManager.getCurrentTheme().text.color;
                doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            }
            
            for (let i = 0; i < parsedContent.length; i++) {
                const element = parsedContent[i];
                const progress = 20 + (i / parsedContent.length * 70); // Progress from 20% to 90%
                const elementType = element.type.charAt(0).toUpperCase() + element.type.slice(1);
                
                UIManager.updateProgress(
                    progress, 
                    `Processing element ${i+1} of ${parsedContent.length}...`,
                    `Processing: ${elementType}${element.type === 'header' ? ' - ' + element.text : ''}`
                );
                
                // Process layout and styling commands
                if (ElementRenderer.isLayoutCommand(element)) {
                    const result = ElementRenderer.processLayoutCommand(element, doc, {
                        currentPage,
                        yPosition,
                        options
                    });
                    
                    // Update position and alignment if needed
                    if (result) {
                        if (result.yPosition !== undefined) yPosition = result.yPosition;
                        if (result.currentPage !== undefined) currentPage = result.currentPage;
                        if (result.alignment !== undefined) alignment = result.alignment;
                    }
                    continue;
                }
                
                // Check if we need to add a new page
                if (yPosition > pageHeight - margin * 2) {
                    doc.addPage();
                    currentPage++;
                    yPosition = margin;
                }
                
                // Ensure text color is maintained between elements for dark theme
                if (isDarkTheme) {
                    const textColor = ThemeManager.getCurrentTheme().text.color;
                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                }
                
                // Render the element
                const renderResult = await ElementRenderer.renderElement(element, doc, {
                    pageWidth,
                    pageHeight,
                    contentWidth,
                    margin,
                    yPosition,
                    currentPage,
                    alignment,
                    headerPageMap,
                    outlineEntries,
                    options
                });
                
                // Update position and page if needed
                if (renderResult) {
                    if (renderResult.yPosition !== undefined) yPosition = renderResult.yPosition;
                    if (renderResult.currentPage !== undefined) currentPage = renderResult.currentPage;
                }
            }
            
            // Enhanced header mapping for more robust links
            const enhancedHeaderMapping = (headerMap, parsedContent) => {
                // Pre-process all headers to create multiple mapping variants
                parsedContent.forEach(element => {
                    if (element.type === 'header' && element.id) {
                        const page = headerMap.get(element.id);
                        if (page) {
                            // Create standard variations of header IDs
                            const variations = [
                                element.id,
                                '#' + element.id,
                                element.text.toLowerCase(),
                                element.text.toLowerCase().replace(/\s+/g, '-'),
                                element.text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-'),
                                element.text.toLowerCase().replace(/[^a-z0-9]/g, '')
                            ];
                            
                            // Add all variations to the map
                            variations.forEach(variant => {
                                if (!headerMap.has(variant)) {
                                    headerMap.set(variant, page);
                                    Logger.debug(`Added header variant: "${variant}" → Page ${page}`);
                                }
                            });
                        }
                    }
                });
                
                // Log a summary of all available link targets
                Logger.debug(`Enhanced header map now contains ${headerMap.size} entries`);
            };

            // After processing all elements, enhance the header mapping
            enhancedHeaderMapping(headerPageMap, parsedContent);

            UIManager.updateProgress(95, 'Finalizing PDF...', 'Adding page numbers and metadata');
            
            // Get current theme for consistent styling
            let themeTextColor = [0, 0, 0]; // Default black
            if (typeof ThemeManager !== 'undefined') {
                themeTextColor = ThemeManager.getCurrentTheme().text.color;
            }
            
            // Final application of theme to ensure all pages have correct background
            if (typeof ThemeManager !== 'undefined') {
                ThemeManager.finalizeThemeApplication(doc);
            }
            
            // Add footer with page numbers - using theme colors
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                
                // Always use theme color for page numbers - critical for dark theme
                if (typeof ThemeManager !== 'undefined') {
                    const textColor = ThemeManager.getCurrentTheme().text.color;
                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                } else {
                    // Use appropriate default based on isDarkTheme
                    if (isDarkTheme) {
                        doc.setTextColor(255, 255, 255); // White for dark theme
                    } else {
                        doc.setTextColor(100, 100, 100); // Gray for light theme
                    }
                }
                
                // Add page numbers at the bottom center of each page
                const pageNumberText = `Page ${i} of ${totalPages}`;
                const pageWidth = doc.internal.pageSize.getWidth();
                doc.text(pageNumberText, pageWidth / 2, pageHeight - 10, { align: 'center' });
                
                // Ensure we restore text color after adding page numbers
                doc.setTextColor(themeTextColor[0], themeTextColor[1], themeTextColor[2]);
            }
            
            // Debug: Dump document structure information
            Logger.debug(`Document has ${totalPages} pages and ${headerPageMap.size} mapped headers`);
            Logger.debug(`Link targets available: ${Array.from(headerPageMap.keys()).join(', ')}`);
            
            // Finalize document with proper metadata
            doc.setProperties({
                title: 'Docsify Generated PDF',
                subject: 'Generated from Markdown content',
                author: 'Docsify PDF Generator',
                keywords: 'pdf,docsify,markdown',
                creator: 'Docsify PDF Generator'
            });
            
            // Save with a short delay to allow UI updates
            setTimeout(() => {
                doc.save('docsify-document.pdf');
                UIManager.updateProgress(100, 'Done!', 'PDF generated and downloaded successfully');
            }, 500);
            
        } catch (error) {
            Logger.error('Error generating PDF:', error);
            UIManager.updateProgress(0, `Error: ${error.message}`, 'PDF generation failed');
        }
    }
    
    // Add enhanced strikethrough support
    function enhanceStrikethroughSupport(doc) {
        // Add helper method for drawing line with custom width
        doc.drawStrikethrough = function(x, y, width, thickness = 0.5) {
            const originalLineWidth = this.getLineWidth();
            this.setLineWidth(thickness);
            this.line(x, y, x + width, y);
            this.setLineWidth(originalLineWidth);
            return this;
        };
    }
    
    // Enhance basic text support (simplified version without emoji support)
    function enhanceBasicTextSupport(doc) {
        // Add a flag to track if we've already processed a text value
        doc.__processedTexts = new Set();
        
        // Override the text method to handle basic character handling
        const originalText = doc.text;
        doc.text = function(text, x, y, options) {
            // Pre-process text for better compatibility
            if (Array.isArray(text)) {
                return originalText.call(this, 
                    text.map(t => normalizeText(t, this)),
                    x, y, options);
            } else {
                return originalText.call(this, normalizeText(text, this), x, y, options);
            }
        };
        
        // Track font changes
        const originalSetFont = doc.setFont;
        doc.setFont = function(family, style, weight) {
            const result = originalSetFont.call(this, family, style, weight);
            // Store current font info for basic handling
            this.__currentFont = {
                family: family,
                style: style,
                encoding: family === 'courier' ? 'Standard' : 'WinAnsiEncoding'
            };
            return result;
        };
        
        // Helper to normalize text for better display
        function normalizeText(text, docObj) {
            if (typeof text !== 'string') return text;
            
            // Skip if already processed this exact string
            const textKey = `${text}`;
            if (docObj.__processedTexts.has(textKey)) return text;
            
            // Add to processed set
            docObj.__processedTexts.add(textKey);
            
            try {
                // Use basic character translations for problematic characters
                return text
                    // Replace emoji with simple placeholder
                    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '•')
                    // Convert non-ASCII chars to their closest ASCII equivalent
                    .replace(/[^\x00-\x7F]/g, char => {
                        // Return common equivalents for special characters
                        const charCode = char.charCodeAt(0);
                        // Basic accented letters
                        if (charCode >= 192 && charCode <= 214) return 'A'; // À-Ö
                        if (charCode >= 216 && charCode <= 222) return 'O'; // Ø-Þ
                        if (charCode >= 224 && charCode <= 246) return 'a'; // à-ö
                        if (charCode >= 248 && charCode <= 254) return 'o'; // ø-þ
                        // Common symbols
                        if (charCode >= 8592 && charCode <= 8703) return '-'; // Arrows and math
                        if (charCode >= 8704 && charCode <= 8959) return '+'; // More math
                        if (charCode >= 9632 && charCode <= 9727) return '*'; // Shapes
                        return '.'; // Fallback for other chars
                    });
            } catch (e) {
                Logger.error("Error normalizing text:", e);
                return text;
            }
        }
    }

    // Debug PDF generation - just parse and log
    function debugPDF(options) {
        generatePDF(options, true);
    }
    
    return {
        generatePDF,
        debugPDF
    };
})();
