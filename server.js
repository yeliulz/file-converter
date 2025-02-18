require('dotenv').config();
const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const XLSX = require("xlsx");
const nodemailer = require("nodemailer");
const { Document, Packer, Paragraph, TextRun } = require("docx");


const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static(path.join(__dirname, "public")));


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify transporter connection
transporter.verify((error) => {
    if (error) {
        console.error('Error verifying transporter:', error);
    } else {
        console.log('Server is ready to send emails');
    }
});


const sendEmail = async (mailOptions) => {
    try {
        console.log('Attempting to send email to:', mailOptions.to);
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        if (error.code === 'EAUTH') {
            console.error('Authentication failed. Please check your email credentials.');
        } else if (error.code === 'ECONNECTION') {
            console.error('Connection to email server failed.');
        } else {
            console.error('Email sending error:', error.message);
        }
        throw error;
    }
};


const convertFile = async (req, res) => {
    try {
        console.log('Received file upload request');
        const email = req.body.email;
        if (!email) {
            throw new Error('Email is required');
        }
        
        const file = req.file;
        if (!file) {
            throw new Error('No file uploaded');
        }
        
        console.log('Processing file:', file.originalname);
        const ext = path.extname(file.originalname).toLowerCase();
        const outputPath = `converted/${path.parse(file.originalname).name}.docx`;
        
        // Ensure converted directory exists
        await fs.mkdir('converted', { recursive: true });


        let content = "";

        try {
            if (ext === ".pdf") {
                console.log('Processing PDF file');
                const data = await pdfParse(await fs.readFile(file.path));
                content = data.text;
                if (!content) throw new Error('Failed to extract text from PDF');
            } else if (ext === ".xlsx" || ext === ".xls") {
                console.log('Processing Excel file');
                const workbook = XLSX.readFile(file.path);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                content = XLSX.utils.sheet_to_csv(sheet); // Changed to CSV for better formatting
                if (!content) throw new Error('Failed to extract data from Excel');
            } else {
                await fs.unlink(file.path);
                return res.json({ message: "Unsupported file type!" });
            }
        } catch (err) {
            console.error('Error processing file:', err);
            await fs.unlink(file.path);
            return res.status(500).json({ 
                message: "File processing failed!", 
                error: err.message 
            });
        }


        // Create Word document with proper formatting
        const doc = new Document({
            sections: [{
                properties: {},
                children: content.split('\n').map(line => 
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: line,
                                break: 1
                            })
                        ]
                    })
                )
            }]
        });


        // Save the document
        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile(outputPath, buffer);

        if (!await fs.access(outputPath).then(() => true).catch(() => false)) {
            throw new Error("Failed to create output file");
        }

        console.log('File successfully converted:', outputPath);


        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your Converted File",
            text: "Here is your converted file.",
            attachments: [{ 
                filename: `${path.parse(file.originalname).name}.docx`, 
                path: outputPath 
            }]
        };

        try {
            console.log('Starting file conversion process');
            const emailInfo = await sendEmail(mailOptions);
            console.log('Email successfully sent:', emailInfo.messageId);
            await fs.unlink(file.path);
            console.log('Temporary uploaded file deleted:', file.path);

            setTimeout(async () => {
                try {
                    await fs.unlink(outputPath);
                    console.log(`Deleted converted file: ${outputPath}`);
                } catch (err) {
                    console.error(`Error deleting converted file: ${outputPath}`, err);
                }
            }, 5 * 60 * 1000);

            res.json({ message: "File converted and sent to email!" });
        } catch (error) {
            console.error("Error sending email:");
            console.error("- Code:", error.code);
            console.error("- Response:", error.response);
            console.error("- Stack:", error.stack);
            return res.json({ message: "Error sending email!", error: error.message });
        }
    } catch (error) {
        console.error("Error during file conversion:", error);
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(err => {
                console.error('Error deleting temporary file:', err);
            });
        }
        res.status(500).json({ 
            message: "Conversion failed!", 
            error: error.message,
            details: error.stack 
        });

    }
};

app.post("/convert", upload.single("file"), convertFile);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Handle port conflicts
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use, trying another port...`);
        const newPort = port + 1;
        server.listen(newPort);
    } else {
        console.error('Server error:', error);
    }
});
