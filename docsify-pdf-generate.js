(function() {
    // Function to dynamically load jsPDF script
    function loadJSPDF(callback) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    // Function to dynamically load the local outline plugin script
    function loadOutlinePlugin(callback) {
        const script = document.createElement('script');
        script.src = 'jspdf-module/outline.js'; // Adjust the path as needed
        script.onload = callback;
        document.head.appendChild(script);
    }

    function createSettingsDiv() {
        const settingsDiv = document.createElement('div');
        settingsDiv.style.position = 'fixed';
        settingsDiv.style.top = '50%';
        settingsDiv.style.left = '50%';
        settingsDiv.style.transform = 'translate(-50%, -50%)';
        settingsDiv.style.padding = '20px';
        settingsDiv.style.backgroundColor = '#fff';
        settingsDiv.style.border = '1px solid #ccc';
        settingsDiv.style.zIndex = '1000';
        settingsDiv.style.display = 'none';
        settingsDiv.innerHTML = `
            <h3>PDF Settings</h3>
            <label for="paperSize">Paper Size:</label>
            <select id="paperSize">
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
            </select>
            <br/>
            <label for="theme">Theme:</label>
            <select id="theme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
            <br/>
            <button id="startPDF">Start</button>
            <button id="cancelPDF">Cancel</button>
            <button id="debugPDF">Debug</button>
            <div id="progressBar" style="display: none;">
                <progress value="0" max="100" style="width: 100%;"></progress>
            </div>
        `;
        document.body.appendChild(settingsDiv);
        return settingsDiv;
    }

    async function fetchMarkdownContent() {
        const response = await fetch('README.md'); // Adjust the path as needed
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
    }

    function parseMarkdown(content) {
        const lines = content.split('\n');
        return lines.map(line => {
            const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const text = headerMatch[2];
                return { type: 'header', level, text };
            }

            const imageMatch = line.match(/!\[.*?\]\((.*?)\)/);
            if (imageMatch) {
                const url = imageMatch[1];
                return { type: 'image', url };
            }

            return { type: 'text', text: line };
        });
    }

    async function generatePDF(paperSize, theme, debug = false) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            format: paperSize,
        });

        let content;
        try {
            content = await fetchMarkdownContent();
        } catch (error) {
            console.error('Error fetching Markdown content:', error);
            return;
        }

        const parsedContent = parseMarkdown(content);

        const progressBar = document.getElementById('progressBar');
        if (!debug) progressBar.style.display = 'block';
        const progress = progressBar.querySelector('progress');

        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        let yPosition = 10;
        const outlineEntries = [];
        const jsPDFCommands = [];
        const outlineStack = [];

        for (let i = 0; i < parsedContent.length; i++) {
            const element = parsedContent[i];
            if (element.type === 'header') {
                const fontSize = 20 - (element.level * 2);
                doc.setFontSize(fontSize);
                doc.text(element.text, 10, yPosition);
                jsPDFCommands.push(`doc.setFontSize(${fontSize});`);
                jsPDFCommands.push(`doc.text("${element.text}", 10, ${yPosition});`);

                // Add entry to outline
                while (outlineStack.length >= element.level) {
                    outlineStack.pop();
                }
                const parent = outlineStack.length > 0 ? outlineStack[outlineStack.length - 1] : null;
                const outlineEntry = doc.outline.add(parent, element.text, { pageNumber: doc.internal.getNumberOfPages(), y: yPosition });
                outlineStack.push(outlineEntry);

                yPosition += 10;
            } else if (element.type === 'image') {
                const imageUrl = element.url;
                const image = new Image();
                image.src = imageUrl;
                await new Promise((resolve, reject) => {
                    image.onload = () => {
                        const imgWidth = image.width;
                        const imgHeight = image.height;
                        const pdfWidth = 180;
                        const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

                        if (yPosition + pdfHeight > doc.internal.pageSize.height - 20) {
                            doc.addPage();
                            jsPDFCommands.push(`doc.addPage();`);
                            yPosition = 10;
                        }

                        doc.addImage(image, 'JPEG', 10, yPosition, pdfWidth, pdfHeight);
                        jsPDFCommands.push(`doc.addImage("${imageUrl}", "JPEG", 10, ${yPosition}, ${pdfWidth}, ${pdfHeight});`);
                        yPosition += pdfHeight + 10;
                        resolve();
                    };
                    image.onerror = () => {
                        console.error('Error loading image:', imageUrl);
                        resolve();
                    };
                });
            } else if (element.type === 'text') {
                if (element.text.trim() !== '') {
                    doc.setFontSize(12);
                    doc.text(element.text, 10, yPosition);
                    jsPDFCommands.push(`doc.setFontSize(12);`);
                    jsPDFCommands.push(`doc.text("${element.text}", 10, ${yPosition});`);
                    yPosition += 10;
                }
            }

            if (yPosition > doc.internal.pageSize.height - 20) {
                doc.addPage();
                jsPDFCommands.push(`doc.addPage();`);
                yPosition = 10;
            }

            if (!debug) progress.value = (i / parsedContent.length) * 100;
        }

        if (theme === 'dark') {
            document.body.classList.remove('dark-theme');
        }

        if (!debug) progressBar.style.display = 'none';

        if (debug) {
            console.log("Markdown Content:", content);
            console.log("Parsed Content:", parsedContent);
            console.log("jsPDF Commands:", jsPDFCommands.join('\n'));
            console.log("Outline Entries:", outlineEntries);
        } else {
            doc.save('docsify-site.pdf');
        }
    }

    window.$docsify.plugins = [].concat(function(hook, vm) {
        hook.mounted(function() {
            loadJSPDF(function() {
                loadOutlinePlugin(function() {
                    const settingsDiv = createSettingsDiv();

                    const printButton = document.createElement('button');
                    printButton.innerText = 'Print to PDF';
                    printButton.style.position = 'fixed';
                    printButton.style.bottom = '10px';
                    printButton.style.right = '10px';
                    printButton.onclick = function() {
                        settingsDiv.style.display = 'block';
                    };
                    document.body.appendChild(printButton);

                    document.getElementById('startPDF').onclick = () => {
                        const paperSize = document.getElementById('paperSize').value;
                        const theme = document.getElementById('theme').value;
                        generatePDF(paperSize, theme);
                        settingsDiv.style.display = 'none';
                    };

                    document.getElementById('cancelPDF').onclick = () => {
                        settingsDiv.style.display = 'none';
                    };

                    document.getElementById('debugPDF').onclick = () => {
                        const paperSize = document.getElementById('paperSize').value;
                        const theme = document.getElementById('theme').value;
                        generatePDF(paperSize, theme, true);
                        settingsDiv.style.display = 'none';
                    };
                });
            });
        });
    }, window.$docsify.plugins);
})();
