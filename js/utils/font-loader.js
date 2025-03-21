/**
 * Font loader utility for Docsify PDF Generator
 * Enables proper UTF-8 and emoji support by loading Unicode-compatible fonts
 */
const FontLoader = (function() {
    // Track loaded fonts
    let fontsLoaded = false;
    let customFontsAvailable = false;
    
    // Font loading options with improved emoji support
    const fontOptions = {
        // Default font paths - can be overridden in config
        notoSansPath: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@4.5.1/files/noto-sans-all-400-normal.woff',
        notoEmojiPath: 'https://cdn.jsdelivr.net/npm/emoji-toolkit@8.0.0/fonts/joypixels-awesome.ttf',
        notoSansBoldPath: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@4.5.1/files/noto-sans-all-700-normal.woff',
        openSansPath: 'https://cdn.jsdelivr.net/npm/@fontsource/open-sans@4.5.13/files/open-sans-latin-400-normal.woff',
        // Fallback paths
        fallbackEmojiPath: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@v2.034/fonts/NotoColorEmoji.ttf'
    };
    
    /**
     * Load font data from URL
     */
    async function loadFontData(url) {
        try {
            Logger.debug(`Loading font from: ${url}`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch font: ${response.statusText}`);
            }
            
            // Get font data as ArrayBuffer
            const fontData = await response.arrayBuffer();
            Logger.debug(`Font loaded successfully: ${url} (${fontData.byteLength} bytes)`);
            return fontData;
        } catch (error) {
            Logger.error(`Error loading font from ${url}:`, error);
            return null;
        }
    }
    
    /**
     * Add custom fonts to jsPDF instance with improved emoji support
     */
    async function addFontsToDocument(doc) {
        try {
            if (!doc || typeof doc.addFont !== 'function') {
                Logger.error('Invalid jsPDF instance');
                return false;
            }
            
            // Check if fonts already added to this document
            if (doc.__customFontsAdded) {
                return true;
            }
            
            if (!customFontsAvailable) {
                // First-time loading of fonts - try multiple sources
                Logger.info('Loading Unicode-compatible fonts for better emoji support...');
                
                // Load main font
                const notoSansData = await loadFontData(fontOptions.notoSansPath);
                // Load bold font
                const notoSansBoldData = await loadFontData(fontOptions.notoSansBoldPath);
                // Try to load emoji font
                const emojiFont = await loadFontData(fontOptions.notoEmojiPath) || 
                                  await loadFontData(fontOptions.fallbackEmojiPath);
                
                // Add standard font if available
                if (notoSansData) {
                    try {
                        // Add Noto Sans as Unicode-compatible font for all styles
                        doc.addFont(notoSansData, "NotoSans", "normal", "Identity-H");
                        
                        // Add bold version if available, otherwise reuse regular font
                        if (notoSansBoldData) {
                            doc.addFont(notoSansBoldData, "NotoSans", "bold", "Identity-H");
                        } else {
                            doc.addFont(notoSansData, "NotoSans", "bold", "Identity-H");
                        }
                        
                        // Reuse for italic variants (jsPDF can simulate italics)
                        doc.addFont(notoSansData, "NotoSans", "italic", "Identity-H");
                        doc.addFont(notoSansBoldData || notoSansData, "NotoSans", "bolditalic", "Identity-H");
                        
                        // Add emoji font if available
                        if (emojiFont) {
                            doc.addFont(emojiFont, "EmojiFont", "normal", "Identity-H");
                            Logger.info('Emoji font loaded successfully');
                        } else {
                            Logger.warn('Emoji font loading failed, using text fallbacks');
                        }
                        
                        // Mark as available for future documents
                        customFontsAvailable = true;
                        Logger.info('Unicode-compatible fonts added to document');
                        
                        // Set as default font
                        doc.setFont("NotoSans", "normal", "Identity-H");
                    } catch (fontError) {
                        Logger.error('Error adding custom font:', fontError);
                    }
                }
            } else {
                // Fonts were already loaded once, just set the font
                doc.setFont("NotoSans", "normal", "Identity-H");
                Logger.debug('Using previously loaded Unicode fonts');
            }
            
            // Mark this document instance as having custom fonts
            doc.__customFontsAdded = true;
            fontsLoaded = true;
            
            return true;
        } catch (error) {
            Logger.error('Error in font loading process:', error);
            return false;
        }
    }
    
    /**
     * Set up font handling in the PDF document with emoji support
     */
    function setupFontHandling(doc) {
        // Override setFont to maintain Unicode encoding with custom fonts
        const originalSetFont = doc.setFont;
        doc.setFont = function(family, style, weight) {
            // Track if we're using custom Unicode font
            const isUsingUnicodeFont = family === "NotoSans" || family === "EmojiFont" || 
                                      (family === undefined && this.__currentFont?.family === "NotoSans");
            
            // Special case for emoji - attempt to use dedicated emoji font
            if (family === "emoji" && doc.__customFontsAdded) {
                try {
                    const fontKey = originalSetFont.call(this, "EmojiFont", "normal", "Identity-H");
                    this.__currentFont = {
                        family: "EmojiFont",
                        style: "normal",
                        encoding: "Identity-H",
                        isEmoji: true
                    };
                    return fontKey;
                } catch (e) {
                    // Fallback to NotoSans if EmojiFont unavailable
                    Logger.debug('Emoji font unavailable, using NotoSans fallback');
                }
            }
            
            // Always use Identity-H encoding with our custom fonts
            if (isUsingUnicodeFont) {
                const fontKey = originalSetFont.call(this, family || "NotoSans", style, "Identity-H");
                // Store current font info for Unicode handling
                this.__currentFont = {
                    family: family || "NotoSans",
                    style: style || "normal",
                    encoding: "Identity-H"
                };
                return fontKey;
            }
            
            // For other fonts, use standard encoding
            const fontKey = originalSetFont.call(this, family, style, weight);
            // Update current font info
            this.__currentFont = {
                family: family || "helvetica",
                style: style || "normal",
                encoding: family === "courier" ? "Standard" : "WinAnsiEncoding"
            };
            return fontKey;
        };
        
        // Add a convenient emoji method
        doc.setEmojiFont = function() {
            return this.setFont("emoji");
        };
        
        return doc;
    }
    
    /**
     * Initialize fonts for a PDF document
     */
    async function initializeFonts(doc) {
        // Add Unicode-compatible fonts
        const fontsAdded = await addFontsToDocument(doc);
        
        // Set up font handling
        if (fontsAdded) {
            setupFontHandling(doc);
        }
        
        return fontsAdded;
    }
    
    /**
     * Check if custom fonts are available
     */
    function areFontsLoaded() {
        return fontsLoaded;
    }
    
    /**
     * Set custom options for font loading
     */
    function setOptions(options) {
        if (options.notoSansPath) {
            fontOptions.notoSansPath = options.notoSansPath;
        }
        if (options.notoEmojiPath) {
            fontOptions.notoEmojiPath = options.notoEmojiPath;
        }
    }
    
    return {
        initializeFonts,
        areFontsLoaded,
        setOptions
    };
})();
