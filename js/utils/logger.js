/**
 * Logger utility for Docsify PDF Generator
 */
const Logger = (function() {
    const LogLevel = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };
    
    // Set default log level to debug for development
    let currentLogLevel = LogLevel.DEBUG; // Changed from INFO to DEBUG to help troubleshoot
    
    function setLogLevel(level) {
        currentLogLevel = level;
    }
    
    function debug(message, ...args) {
        if (currentLogLevel <= LogLevel.DEBUG) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }
    
    function info(message, ...args) {
        if (currentLogLevel <= LogLevel.INFO) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }
    
    function warn(message, ...args) {
        if (currentLogLevel <= LogLevel.WARN) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }
    
    function error(message, ...args) {
        if (currentLogLevel <= LogLevel.ERROR) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
    
    // Enhance dumpHeaderMap to show more diagnostic info
    function dumpHeaderMap(headerMap) {
        if (currentLogLevel <= LogLevel.DEBUG) {
            console.log('[DEBUG] Header to Page Mapping:');
            
            // Sort keys to make output more readable
            const sortedEntries = Array.from(headerMap.entries())
                .sort((a, b) => a[0].localeCompare(b[0]));
            
            // Group by page for easier analysis
            const pageGroups = {};
            sortedEntries.forEach(([id, page]) => {
                if (!pageGroups[page]) pageGroups[page] = [];
                pageGroups[page].push(id);
            });
            
            // Log grouped by page
            console.log('--- Grouped by page ---');
            Object.keys(pageGroups).sort((a, b) => Number(a) - Number(b)).forEach(page => {
                console.log(`Page ${page}:`);
                pageGroups[page].forEach(id => {
                    console.log(`  - "${id}"`);
                });
            });
            
            // Log all ids in alphabetical order
            console.log('--- Alphabetical listing ---');
            sortedEntries.forEach(([id, page]) => {
                console.log(`  "${id}" → Page ${page}`);
            });
        }
    }

    return {
        LogLevel,
        setLogLevel,
        debug,
        info,
        warn,
        error,
        dumpHeaderMap  // Add the new method to the exported object
    };
})();
