# 📚 Comic & Manga Translator v2

A modern, fast, and feature-rich web application to translate comic/manga pages. The application automatically detects speech bubbles using **YOLOv5**, extracts text using **Manga-OCR** (for Japanese) or **EasyOCR** (for English/Korean/Chinese), translates it using **Google Gemini AI** or **Google Translate**, and renders the translation back onto the page with clean, aligned, and hyphenated text blocks.

---

## ✨ Features

- **Automatic Bubble Detection**: Utilizes a custom-trained **YOLOv5** PyTorch model to identify bubble coordinates.
- **Advanced OCR Engines**: 
  - **Manga-OCR** for highly accurate Japanese vertical/horizontal handwriting and manga fonts.
  - **EasyOCR** for English, Chinese, and Korean text.
- **Dual Translation Engines**:
  - **Google Translate** (default, free, no-key required).
  - **Google Gemini AI** (Gemini 1.5 Flash) for natural, contextual translations. Fully compatible with Google's new `AQ.` authentication key formats.
- **Batch Translation Optimization**: Dialogue bubbles are batched into a single API request, reducing Gemini API latency and costs by up to 90%.
- **Smart Hyphenation & Spacing**:
  - Syllabic hyphenation using `pyphen` (supporting Indonesian and English language rules).
  - **Length Guard**: Words with **5 letters or fewer** (e.g. *makan, sabun, baju*) are protected from hyphenation to keep dialogue natural.
- **Dynamic Text Backgrounds**:
  - The white background behind translated text dynamically snaps to the size of the YOLOv5 detection box.
  - If text overflows, the background expands with a tight, professional 3px padding.
- **Translation History Dashboard**:
  - Saves your past translations locally using browser `localStorage` (lightweight storage using image URLs served by the backend).
  - Toggle between **Grid (Card) View** and **List View**.
  - **Floating Reader Modal**: Click any card in the history to open a glassmorphic overlay displaying the original and translated comic pages side-by-side.
- **Refactored Architecture**: Modularized page layout using React Router and clean design tokens.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS (v4), React Router, Lucide Icons, jsPDF.
- **Backend**: Flask, PyTorch (YOLOv5), Manga-OCR, EasyOCR, Pillow, Pyphen.

---

## 🚀 Setup & Installation

Follow these steps to run the application on your local machine.

### Prerequisites

- **Python 3.9** or higher installed.
- **Node.js 18** or higher installed.
- (Optional) CUDA-compatible GPU for faster YOLO and OCR processing (defaults to CPU if unavailable).

---

### 1. Backend Setup

1. Open your terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create a Python virtual environment:
   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *Note: Installing `torch` (PyTorch) might take a few minutes depending on your internet connection.*

5. Ensure the YOLOv5 weights (`best.pt`) are located in the path:
   `backend/yolo-model/bubble-detector-new/weights/best.pt`

6. Start the Flask backend server:
   ```bash
   python app.py
   ```
   The backend will start running at `http://127.0.0.1:5000`.

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install the node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite React development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

---

## 📖 How to Use

1. **Upload Images**: Click the **UPLOAD GAMBAR** button on the Home page and select one or more comic/manga pages.
2. **Choose Languages**: Select the source language (Japanese, English, Korean, or Chinese) and the target language (Indonesian or English).
3. **Select Translation Engine**:
   - Go to the **Settings** page via the Navbar.
   - Choose between **Google Translate** or **Google Gemini AI**.
   - If using Gemini, enter your Gemini API Key (obtained for free from [Google AI Studio](https://aistudio.google.com/)) and click **SIMPAN PENGATURAN**.
4. **Translate**: Click **Terjemahkan** on the Home page. The progress will update in real time.
5. **View History**: Read through old translations on the **History** page, search for them, or view them side-by-side in the floating modal reader.
6. **Download**: Once processed, click **DOWNLOAD PDF** to compile your translated comic pages into a single PDF document.

---

## 📂 Project Structure

```
scan-translator-v2/
├── backend/
│   ├── app.py                # Flask API routes
│   ├── image_processor.py    # YOLOv5, OCR, batch translation, Pillow renderer
│   ├── requirements.txt      # Python dependencies
│   └── static/               
│       ├── fonts/            # Manga Fonts (WinkyRough, TradeWinds)
│       └── uploads/          # Saved source and output images
├── frontend/
│   ├── package.json          # Node dependencies and scripts
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx    # Centered logo glassmorphic navigation
│   │   ├── pages/
│   │   │   ├── Home.jsx      # Translation panel & layout
│   │   │   ├── History.jsx   # List/Card toggler & reading modal
│   │   │   └── Settings.jsx  # Engine & API Key configurations
│   │   ├── App.jsx           # React router orchestration
│   │   └── index.css         # Custom typography & Tailwind imports
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open issues or pull requests to improve translation layouting, bubble detection accuracy, or UI customization.
