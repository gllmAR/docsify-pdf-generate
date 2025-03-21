/**
 * Enhanced UTF-8 support for Docsify PDF Generator
 * Adapted from jsPDF's utf8 plugin with optimizations for our use case
 */
const UTF8Support = (function() {
    /**
     * Helper to inspect jsPDF structure and find API
     */
    function getJsPDFAPI(jsPDF) {
        if (!jsPDF) {
            Logger.warn('UTF8Support: jsPDF object is null or undefined');
            return null;
        }
        
        // Log structure to console for debugging
        Logger.debug('jsPDF structure:', Object.keys(jsPDF));
        
        if (jsPDF.API) {
            Logger.debug('Found direct API property');
            return jsPDF.API;
        } 
        
        if (jsPDF.jsPDF && jsPDF.jsPDF.API) {
            Logger.debug('Found nested API property');
            return jsPDF.jsPDF.API;
        }
        
        // Try to find API at other common locations
        if (typeof jsPDF === 'function' && jsPDF.prototype) {
            Logger.debug('jsPDF appears to be a constructor function');
            return jsPDF.prototype;
        }
        
        Logger.error('Could not locate jsPDF API. jsPDF:', jsPDF);
        return null;
    }
    
    // Initialize the module when jsPDF is loaded
    function initialize(jsPDF) {
        if (!jsPDF) {
            Logger.warn('UTF8Support: jsPDF not available');
            return false;
        }
        
        // Use the helper to get the API
        const jsPDFAPI = getJsPDFAPI(jsPDF);
        
        if (!jsPDFAPI) {
            Logger.error('UTF8Support: Failed to find jsPDF API');
            return false;
        }
        
        // Check if already initialized
        if (jsPDFAPI.__utf8Initialized) {
            return true;
        }
        
        /**
         * Convert Unicode text to a hexadecimal string using font's glyph data
         */
        jsPDFAPI.pdfEscape16 = function(text, font) {
            if (!font || !font.metadata || !font.metadata.Unicode) {
                return text; // Fallback if font metadata isn't available
            }
            
            const widths = font.metadata.Unicode.widths;
            const padz = ["", "0", "00", "000", "0000"];
            const ar = [""];
            
            try {
                for (let i = 0, l = text.length, t; i < l; ++i) {
                    t = font.metadata.characterToGlyph(text.charCodeAt(i));
                    
                    // Update font metadata
                    font.metadata.glyIdsUsed = font.metadata.glyIdsUsed || [];
                    font.metadata.toUnicode = font.metadata.toUnicode || {};
                    
                    font.metadata.glyIdsUsed.push(t);
                    font.metadata.toUnicode[t] = text.charCodeAt(i);
                    
                    // Ensure width information is available
                    if (!widths.includes(t)) {
                        widths.push(t);
                        widths.push([parseInt(font.metadata.widthOfGlyph(t), 10)]);
                    }
                    
                    // Handle spaces specially
                    if (t == "0") {
                        return ar.join("");
                    } else {
                        t = t.toString(16);
                        ar.push(padz[4 - t.length], t);
                    }
                }
                return ar.join("");
            } catch (error) {
                Logger.error('Error in pdfEscape16:', error);
                return text; // Return original text on error
            }
        };
        
        /**
         * Create a CMap (Character Map) for Unicode font embedding
         */
        function toUnicodeCmap(map) {
            if (!map || Object.keys(map).length === 0) {
                return null;
            }
            
            try {
                let unicodeMap =
                    "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo <<\n" +
                    "  /Registry (Adobe)\n  /Ordering (UCS)\n  /Supplement 0\n>> def\n" +
                    "/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000><ffff>\nendcodespacerange";
                
                const codes = Object.keys(map).sort((a, b) => a - b);
                const range = [];
                
                for (let i = 0; i < codes.length; i++) {
                    const code = codes[i];
                    
                    // Process ranges in batches of 100
                    if (range.length >= 100) {
                        unicodeMap +=
                            "\n" +
                            range.length +
                            " beginbfchar\n" +
                            range.join("\n") +
                            "\nendbfchar";
                        range.length = 0;
                    }
                    
                    // Add to range if the mapping is valid
                    if (map[code] !== undefined && map[code] !== null) {
                        const unicode = ("0000" + map[code].toString(16)).slice(-4);
                        const codeHex = ("0000" + (+code).toString(16)).slice(-4);
                        range.push("<" + codeHex + "><" + unicode + ">");
                    }
                }
                
                // Add any remaining entries
                if (range.length) {
                    unicodeMap +=
                        "\n" +
                        range.length +
                        " beginbfchar\n" +
                        range.join("\n") +
                        "\nendbfchar\n";
                }
                
                unicodeMap += "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
                return unicodeMap;
            } catch (error) {
                Logger.error('Error generating Unicode CMap:', error);
                return null;
            }
        }
        
        /**
         * Handle UTF-8 text rendering with properly encoded font support
         */
        function utf8TextFunction(args) {
            const text = args.text || "";
            const mutex = args.mutex || {};
            
            const activeFontKey = mutex.activeFontKey;
            const fonts = mutex.fonts;
            
            // Skip processing if not using Unicode encoding
            if (!fonts[activeFontKey] || fonts[activeFontKey].encoding !== "Identity-H") {
                return args;
            }
            
            try {
                let strText = Array.isArray(text) ? text[0] : text;
                let processedStr = "";
                
                // Process each character
                for (let s = 0; s < strText.length; s++) {
                    const char = strText[s];
                    let cmapConfirm = null;
                    
                    // Check for character in font's CMAP
                    if (fonts[activeFontKey].metadata?.cmap?.unicode?.codeMap) {
                        cmapConfirm = fonts[activeFontKey].metadata.cmap.unicode.codeMap[char.charCodeAt(0)];
                    }
                    
                    // Add character if it's available or fallback for ASCII
                    if (cmapConfirm || (char.charCodeAt(0) < 256 && fonts[activeFontKey].metadata?.Unicode)) {
                        processedStr += char;
                    } else {
                        // Skip characters not in font
                        processedStr += '';
                    }
                }
                
                // Process the string using appropriate escape method
                let result = "";
                if (parseInt(activeFontKey.slice(1)) < 14 || fonts[activeFontKey].encoding === "WinAnsiEncoding") {
                    // For basic fonts
                    result = mutex.pdfEscape(processedStr, activeFontKey)
                        .split("")
                        .map(c => c.charCodeAt(0).toString(16))
                        .join("");
                } else if (fonts[activeFontKey].encoding === "Identity-H") {
                    // For Unicode fonts
                    result = jsPDFAPI.pdfEscape16(processedStr, fonts[activeFontKey]);
                }
                
                // Mark as hex-encoded
                mutex.isHex = true;
                
                // Return with updated text
                args.text = result;
                return args;
            } catch (error) {
                Logger.error('Error processing UTF-8 text:', error);
                return args; // Return original args on error
            }
        }
        
        // Register text processor to handle UTF-8 text
        jsPDFAPI.events.push(["postProcessText", function(args) {
            // Process UTF-8 text
            const parms = args;
            const text = parms.text || "";
            
            // Handle arrays of text differently
            if (Array.isArray(text)) {
                const tmpText = [];
                
                for (let i = 0; i < text.length; i++) {
                    if (Array.isArray(text[i])) {
                        if (text[i].length === 3) {
                            // Handle [text, x, y] arrays
                            const processed = utf8TextFunction({
                                text: text[i][0],
                                mutex: parms.mutex
                            }).text;
                            
                            tmpText.push([processed, text[i][1], text[i][2]]);
                        } else {
                            // Handle other arrays
                            tmpText.push(utf8TextFunction({
                                text: text[i],
                                mutex: parms.mutex
                            }).text);
                        }
                    } else {
                        // Handle simple strings
                        tmpText.push(utf8TextFunction({
                            text: text[i],
                            mutex: parms.mutex
                        }).text);
                    }
                }
                
                parms.text = tmpText;
            } else {
                // Handle simple string
                parms.text = utf8TextFunction({
                    text: text,
                    mutex: parms.mutex
                }).text;
            }
        }]);
        
        jsPDFAPI.__utf8Initialized = true;
        return true;
    }
    
    /**
     * Replace problematic emoji and Unicode characters with ASCII equivalents
     * as a fallback for fonts that don't support them
     */
    function preProcessUnicode(text, fontInfo) {
        if (typeof text !== 'string' || !text) return text;
        
        // Skip processing if using a fully Unicode-capable font
        if (fontInfo && fontInfo.encoding === 'Identity-H') {
            return text;
        }
        
        try {
            // Use EmojiHandler if available
            if (typeof EmojiHandler !== 'undefined') {
                return EmojiHandler.normalizeText(text);
            }
            
            // Fallback to simpler replacements
            return text
                // Strip or replace emoji
                .replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu, '•')
                // Keep ASCII 
                .replace(/[^\x00-\x7F]/g, char => {
                    // Make best effort to replace with similar character
                    const code = char.charCodeAt(0);
                    
                    // Common accented characters - convert to base form
                    if (code >= 0x00C0 && code <= 0x00FF) {
                        // Latin-1 Supplement (á, é, ñ, etc)
                        const baseLatin = 'AAAAAAACEEEEIIIIDNOOOOOOUUUUYsaaaaaaceeeeiiiinoooooouuuuyy';
                        const index = code - 0x00C0;
                        return (index >= 0 && index < baseLatin.length) ? baseLatin[index] : '.';
                    }
                    
                    // Other ranges - attempt to use appropriate fallback
                    return '.';
                });
        } catch (e) {
            Logger.error("Error in preProcessUnicode:", e);
            return text; // Return original on error
        }
    }
    
    return {
        initialize,
        preProcessUnicode
    };
})();
