/**
 * Emoji handling utilities for PDF generation
 * Provides fallback rendering of emoji characters
 */
const EmojiHandler = (function() {
    // Common emoji mappings to standard characters with improved visual representation
    const emojiMappings = {
        // Smileys & emotions - improved representations
        '😀': '😀', '😃': '😃', '😄': '😄', '😁': '😁', '😆': '😆',
        '😅': '😅', '😂': '😂', '🤣': '🤣', '🥲': '🥲', '☺️': '☺️',
        '😊': '😊', '🥰': '🥰', '😍': '😍', '🤩': '🤩', '😘': '😘',
        '😗': '😗', '😚': '😚', '😙': '😙', '😋': '😋', '😛': '😛',
        
        // Fallback mappings when Unicode fonts aren't available
        'FALLBACK_SMILEYS': {
            '😀': ':-)', '😃': ':-D', '😄': ':D', '😁': '^_^', '😆': 'XD',
            '😅': ':\')', '😂': 'LOL', '🤣': 'ROFL', '🥲': ':\')', '☺️': ':-)',
            '😊': ':)', '🥰': '<3', '😍': '<3', '🤩': '*_*', '😘': ':-*',
            '😗': ':-*', '😚': ':-*', '😙': ':-)', '😋': ':-P', '😛': ':P',
        },
        
        // Transportation - better emoji categories
        'TRANSPORT': {
            '🚗': '🚗', '🚕': '🚕', '🚙': '🚙', '🚌': '🚌',
            '🚎': '🚎', '🏎': '🏎', '🚓': '🚓', '🚑': '🚑',
            '🚒': '🚒', '🚐': '🚐', '🚚': '🚚'
        },
        
        'FALLBACK_TRANSPORT': {
            '🚗': '[CAR]', '🚕': '[TAXI]', '🚙': '[SUV]', '🚌': '[BUS]',
            '🚎': '[TRAM]', '🏎': '[RACE-CAR]', '🚓': '[POLICE]', '🚑': '[AMBULANCE]',
            '🚒': '[FIRE-TRUCK]', '🚐': '[VAN]', '🚚': '[TRUCK]'
        },
        
        // Nature - improved categorization
        'NATURE': {
            '🪻': '🪻', '🪷': '🪷', '🌸': '🌸', '💮': '💮',
            '🏵️': '🏵️', '🌹': '🌹', '🥀': '🥀', '🌺': '🌺',
            '🌻': '🌻', '🌼': '🌼', '🌷': '🌷'
        },
        
        'FALLBACK_NATURE': {
            '🪻': '[FLOWER]', '🪷': '[LOTUS]', '🌸': '[BLOSSOM]', '💮': '[FLOWER]',
            '🏵️': '[ROSETTE]', '🌹': '[ROSE]', '🥀': '[WILTED]', '🌺': '[HIBISCUS]',
            '🌻': '[SUNFLOWER]', '🌼': '[DAISY]', '🌷': '[TULIP]'
        }
    };
    
    // More robust emoji detection regex
    const emojiPattern = /[\u{1F000}-\u{1FFFF}]|\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
    
    // Check if Unicode fonts are available
    function hasUnicodeFontSupport(doc) {
        return doc && doc.__currentFont && doc.__currentFont.encoding === 'Identity-H';
    }
    
    // Replace emoji with the appropriate representation based on font support
    function replaceEmoji(text, doc) {
        if (typeof text !== 'string') return text;
        
        try {
            const hasUnicodeSupport = hasUnicodeFontSupport(doc);
            
            // If we have proper Unicode font support, keep original emoji 
            if (hasUnicodeSupport) {
                return text;
            }
            
            // With no Unicode support, use fallback text representations
            let processed = text;
            
            // Apply fallbacks from different categories
            processed = applyFallbacksFromCategory(processed, 'FALLBACK_SMILEYS');
            processed = applyFallbacksFromCategory(processed, 'FALLBACK_TRANSPORT');
            processed = applyFallbacksFromCategory(processed, 'FALLBACK_NATURE');
            
            // Replace any remaining emoji with fancy bullet character
            processed = processed.replace(emojiPattern, '※');
            
            return processed;
        } catch (e) {
            Logger.error("Error processing emoji:", e);
            return text; // Return original if processing fails
        }
    }
    
    // Apply fallback emojis from a specific category
    function applyFallbacksFromCategory(text, category) {
        const mappings = emojiMappings[category];
        if (!mappings) return text;
        
        // Create a safe copy to work with
        let processed = text;
        
        // Replace known emoji in this category with text equivalents
        Object.keys(mappings).forEach(emoji => {
            try {
                processed = processed.replace(new RegExp(emoji, 'g'), mappings[emoji]);
            } catch (err) {
                // Silently fail if regex error - some emoji might cause problems in regex
            }
        });
        
        return processed;
    }
    
    // Replace or remove complex Unicode characters with simple approximations
    function sanitizeComplexUnicode(text, doc) {
        if (typeof text !== 'string') return text;
        
        // If we have Unicode font support, keep original text
        if (hasUnicodeFontSupport(doc)) {
            return text;
        }
        
        try {
            return text
                // Replace common symbol ranges with simpler characters
                .replace(/[\u2600-\u26FF]/g, '*') // Miscellaneous symbols
                .replace(/[\u2700-\u27BF]/g, '*') // Dingbats
                .replace(/[\u27C0-\u27EF]/g, '+') // Miscellaneous Math Symbols-A
                .replace(/[\u2000-\u206F]/g, ' ') // General Punctuation
                .replace(/[\u20A0-\u20CF]/g, '$') // Currency symbols
                .replace(/[\u20D0-\u20FF]/g, '^') // Combining marks for symbols
                
                // Math symbols and arrows
                .replace(/[\u2190-\u21FF]/g, '-') // Arrows
                .replace(/[\u2200-\u22FF]/g, '~') // Mathematical Operators
                .replace(/[\u2300-\u23FF]/g, '*') // Miscellaneous Technical
                .replace(/[\u2400-\u243F]/g, '#') // Control Pictures
                .replace(/[\u2440-\u245F]/g, '#') // Optical Character Recognition
                .replace(/[\u2460-\u24FF]/g, '0') // Enclosed Alphanumerics
                
                // Complex scripts replacement with Latin equivalents
                .replace(/[\u0600-\u06FF]/g, 'A') // Arabic
                .replace(/[\u0590-\u05FF]/g, 'H') // Hebrew
                .replace(/[\u0E00-\u0E7F]/g, 'T') // Thai
                .replace(/[\u4E00-\u9FFF]/g, 'C') // Chinese
                .replace(/[\u3040-\u309F]/g, 'J') // Japanese Hiragana
                .replace(/[\u30A0-\u30FF]/g, 'J') // Japanese Katakana
                .replace(/[\uAC00-\uD7AF]/g, 'K') // Korean Hangul
                .replace(/[\u0400-\u04FF]/g, 'R') // Cyrillic
                .replace(/[\u0370-\u03FF]/g, 'G') // Greek
                .replace(/[\u0900-\u097F]/g, 'D') // Devanagari
                
                // Fallback for any other non-ASCII characters
                .replace(/[^\x00-\x7F]/g, '.');
        } catch (e) {
            console.error("Error sanitizing Unicode:", e);
            
            // Fallback character-by-character replacement for extremely problematic scenarios
            try {
                let result = '';
                for (let i = 0; i < text.length; i++) {
                    const char = text.charAt(i);
                    if (char.charCodeAt(0) > 127) {
                        result += '.';
                    } else {
                        result += char;
                    }
                }
                return result;
            } catch (e2) {
                // Ultimate fallback
                return '[unicode text]';
            }
        }
    }
    
    // Handle complete text normalization in one pass
    function normalizeText(text, doc) {
        if (typeof text !== 'string') return text;
        
        // If we have Unicode font support, keep original text
        if (hasUnicodeFontSupport(doc)) {
            return text;
        }
        
        // First replace emoji, then handle other unicode characters
        const noEmoji = replaceEmoji(text, doc);
        return sanitizeComplexUnicode(noEmoji, doc);
    }
    
    // Check if a string contains non-ASCII characters
    function containsNonAscii(text) {
        if (typeof text !== 'string') return false;
        return /[^\x00-\x7F]/.test(text);
    }
    
    return {
        replaceEmoji,
        sanitizeComplexUnicode,
        normalizeText,
        containsNonAscii
    };
})();
