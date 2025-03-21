/**
 * Dark Theme for Docsify PDF Generator
 */
const DarkTheme = {
    name: 'Dark',
    description: 'Dark theme with light text for reduced eye strain',
    
    // Page settings
    page: {
        backgroundColor: [40, 44, 52], // Slightly different dark background for better contrast
        margins: 10
    },
    
    // Text settings - Using extremely bright white for maximum visibility
    text: {
        color: [255, 255, 255], // Pure white text for maximum visibility
        linkColor: [0, 195, 255], // Much brighter blue for links
        headingColor: [255, 240, 200], // Light yellow for headings (more visible)
        codeColor: [245, 245, 245] // Very light gray for code
    },
    
    // Element settings with enhanced contrast
    elements: {
        // Headers with higher contrast colors
        header: {
            h1: {
                fontSize: 24,
                fontWeight: 'bold',
                color: [255, 240, 200], // Light yellow
                marginBottom: 8
            },
            h2: {
                fontSize: 20,
                fontWeight: 'bold',
                color: [255, 240, 200], // Light yellow
                marginBottom: 6
            },
            h3: {
                fontSize: 16,
                fontWeight: 'bold',
                color: [255, 240, 200], // Light yellow
                marginBottom: 4
            },
            h4: {
                fontSize: 14,
                fontWeight: 'bold',
                color: [255, 240, 200], // Light yellow
                marginBottom: 3
            },
            h5: {
                fontSize: 12,
                fontWeight: 'bold',
                color: [255, 240, 200], // Light yellow
                marginBottom: 2
            },
            h6: {
                fontSize: 11,
                fontWeight: 'bold',
                color: [255, 240, 200], // Light yellow
                marginBottom: 2
            }
        },
        
        // Code blocks with higher contrast
        codeBlock: {
            backgroundColor: [30, 30, 30], // Darker background for code
            borderColor: [60, 60, 60], // Darker border
            color: [245, 245, 245] // Brighter text for code
        },
        
        // Blockquotes
        blockquote: {
            backgroundColor: [50, 50, 50], // Slightly lighter than main background
            borderColor: [80, 80, 80], // Lighter border
            color: [200, 200, 200] // Light gray text
        },
        
        // Tables
        table: {
            headerBackgroundColor: [60, 60, 60], // Darker header
            headerTextColor: [255, 255, 255], // Pure white
            rowBackgroundColor: [45, 45, 45], // Dark rows
            alternateRowBackgroundColor: [50, 50, 50], // Slightly lighter alternate rows
            borderColor: [80, 80, 80] // Visible borders
        },
        
        // Horizontal rule
        horizontalRule: {
            color: [120, 120, 120], // Lighter gray for better visibility
            width: 0.7 // Thicker line
        }
    }
};
