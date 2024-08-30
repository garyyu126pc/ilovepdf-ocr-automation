
# ILovePDF OCR Automation

ILovePDF OCR Automation is a desktop application built with Electron that automates the process of Optical Character Recognition (OCR) for PDF files using the ILovePDF API. The application allows users to select PDF files, apply OCR, and save the processed documents either in their original directories or in a chosen output folder. The app is designed for both development and production environments with secure API key management.

## Features

- **OCR Processing:** Automate the OCR process for multiple PDF files using the ILovePDF API.
- **File Selection:** Easily select multiple PDF files from your file system.
- **Output Options:** Choose to save processed files in their original directory or specify an output folder.
- **Progress Tracking:** View progress as files are processed.
- **API Key Management:** Securely manage your ILovePDF API keys through environment variables or direct input.

## Installation

To get started with ILovePDF OCR Automation, follow these steps:

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/your-username/ilovepdf-ocr-automation.git
   cd ilovepdf-ocr-automation
   ```

2. **Install Dependencies:**

   Make sure you have [Node.js](https://nodejs.org/) installed, then run:

   ```bash
   npm install
   ```

3. **Set Up Environment Variables:**

   Create a `.env` file in the root directory and add your ILovePDF API keys:

   ```bash
   ILOVEPDF_PROJECT_PUBLIC_KEY=your_public_key
   ILOVEPDF_SECRET_KEY=your_secret_key
   ```

4. **Run the Application:**

   Start the application in development mode:

   ```bash
   npm start
   ```

   To build the application for production, run:

   ```bash
   npm run build
   ```

## Usage

1. **Launch the Application:** Run the application using `npm start` or the executable generated from the build process.
2. **Enter API Keys:** If not already set in the `.env` file, enter your ILovePDF API keys in the provided fields.
3. **Select PDF Files:** Click the "Select PDF Files" button to choose the files you want to process.
4. **Choose Output Options:** Decide whether to save files in their original directory or a new output folder.
5. **Process Files:** Click "Process Selected Files" to start the OCR process. Monitor progress until completion.

## Technologies Used

- **Electron:** Framework for building cross-platform desktop apps.
- **Node.js:** JavaScript runtime for backend processing.
- **ILovePDF API:** API used for performing OCR on PDF files.
- **Electron-Store:** Library for managing persistent storage in Electron apps.
- **ADM-Zip:** Library for handling ZIP file extraction.

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to [ILovePDF](https://www.ilovepdf.com/) for providing the OCR API used in this application.
- Icons used in the application are from [Flaticon](https://www.flaticon.com/).
