document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const message = document.getElementById('message');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    // Remove highlight when item is dragged away
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    dropArea.addEventListener('click', () => {
        fileInput.click();
        // Add change listener to show selected file
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                message.textContent = `${fileInput.files.length} file(s) selected.`;
            }
        }, { once: true });
    });


    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length) {
            fileInput.files = files; // Set the file input's files to the dropped files
            message.textContent = `${files.length} file(s) selected.`;
        }
    }

    // Add change listener for direct file selection
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            message.textContent = `${fileInput.files.length} file(s) selected.`;
        }
    });


    // Handle form submission
    const form = document.getElementById('converter-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const file = fileInput.files[0];
        
        if (!file) {
            message.textContent = 'Please select a file first!';
            return;
        }

        const formData = new FormData();
        formData.append('email', email);
        formData.append('file', file);

        try {
            message.textContent = 'Converting and sending file...';
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            message.textContent = result.message;
            
            if (result.error) {
                console.error('Error:', result.error);
            }
        } catch (error) {
            message.textContent = 'An error occurred during conversion';
            console.error('Error:', error);
        }
    });
});
