from flask import Flask, request, jsonify
from flask_cors import CORS
from image_processor import extract_bubbles, render_bubbles, batch_gemini_translate, selectOCR, translator
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join("static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/process-image', methods=['POST'])
def process_image_endpoint():
    try:
        if 'image[]' not in request.files:
            return jsonify({'error': 'No image provided'}), 400

        sourceLang = request.form['source']
        targetLang = request.form['target']
        engine = request.form.get('engine', 'googletrans')
        api_key = request.form.get('apiKey', '')
        files = request.files.getlist('image[]')

        ocr, index, translate_code = selectOCR(sourceLang)

        image_contexts = []
        all_bubbles = []

        # Fase 1: YOLO + OCR
        for img_idx, file in enumerate(files):
            filename = secure_filename(file.filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)

            img_pil, draw, bubbles = extract_bubbles(filepath, ocr, index, translate_code, image_id=img_idx)
            image_contexts.append({
                'img_pil': img_pil, 'draw': draw, 'bubbles': bubbles, 'filename': filename
            })
            all_bubbles.extend(bubbles)

        # Fase 2
        translations = {}
        if engine == 'gemini' and api_key:
            translations = batch_gemini_translate(all_bubbles, translate_code, targetLang, api_key)

        # Fallback googletrans if gemini fail
        for b in all_bubbles:
            if not translations.get(b['id']):
                if b['cleaned_text'].strip():
                    translations[b['id']] = translator.translate(
                        b['cleaned_text'], src=translate_code, dest=targetLang
                    ).text
                else:
                    translations[b['id']] = "[Teks tidak terbaca]"

        # Fase 3
        results = []
        for ctx in image_contexts:
            render_bubbles(ctx['img_pil'], ctx['draw'], ctx['bubbles'], translations, targetLang)

            output_path = os.path.join(UPLOAD_FOLDER, f"output_{ctx['filename']}")
            ctx['img_pil'].save(output_path)

            results.append({
                'original': f"http://127.0.0.1:5000/static/uploads/{ctx['filename']}",
                'translated': f"http://127.0.0.1:5000/static/uploads/output_{ctx['filename']}"
            })

        return jsonify({'results': results})

    except Exception as e:
        print(f"⚠️ Error saat memproses gambar: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)