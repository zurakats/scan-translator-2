import cv2
import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from manga_ocr import MangaOcr
import easyocr
import numpy as np
from googletrans import Translator
import pathlib
import re
import pyphen
import urllib.request
import json
import time

dic_id = pyphen.Pyphen(lang='id_ID')
dic_en = pyphen.Pyphen(lang='en_US')

pathlib.PosixPath = pathlib.WindowsPath

model_path = "yolo-model/bubble-detector-new/weights/best.pt"
model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path, source='github', force_reload=True)
model.conf = 0.75

translator = Translator()

def process_language(sourceLang):
    try:        
        if sourceLang == "jp":
            return "ja"
        elif sourceLang == "ko":
            return "ko"
        elif sourceLang == "ch_sim":
            return "zh_cn"
        elif sourceLang == "en":
            return "en"
            
    except Exception as e:
        print(f"⚠️ Error saat memproses OCR: {e}")
        raise
    
def get_language_codes(sourceLang):
    mapping = {
        "jp": ("jp", "ja"),
        "ko": ("ko", "ko"),
        "ch_sim": ("ch_sim", "zh-cn"),
        "ch_tra": ("ch_tra", "zh-tw"),
        "en": ("en", "en")
    }

    if sourceLang not in mapping:
        raise ValueError(f"Unsupported language code: {sourceLang}")

    return mapping[sourceLang] 

def selectOCR(sourceLang):
    easyocr_code, translate_code = get_language_codes(sourceLang)
    
    if (easyocr_code == "jp"):
        return MangaOcr(), 0, translate_code
    else:
        return easyocr.Reader([f'{easyocr_code}']), 1, translate_code

def clean_ocr_text(ocr_text):
    if not ocr_text:
        return ""
    cleaned_text = re.sub(r'\bLai\b', '!', ocr_text)
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
    return cleaned_text

def _parse_json_array(raw_text):
    # extract a JSON array from Gemini's response text.
    text = raw_text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find('[')
        end = text.rfind(']')
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass
    print("⚠️ Gagal parse JSON dari Gemini, batch ini fallback ke googletrans")
    return []

def batch_gemini_translate(bubbles, source_lang, target_lang, api_key, batch_size=40, max_retries=1):
    api_key = api_key.strip().replace('"', '').replace("'", "")
    translations = {}

    items = [{"id": b["id"], "text": b["cleaned_text"]} for b in bubbles if b["cleaned_text"].strip()]
    if not items:
        return translations

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"

    for i in range(0, len(items), batch_size):
        chunk = items[i:i + batch_size]
        print(f"[Gemini] Batch translating {len(chunk)} teks (item {i+1}-{i+len(chunk)} dari {len(items)})")

        prompt = (
            f"You will translate comic/manga dialogue lines from {source_lang} to {target_lang}. "
            f"Below is a JSON array of objects, each with an \"id\" and \"text\" field. "
            f"Translate the \"text\" of each object naturally, keeping tone and context appropriate for a comic. "
            f"Respond with ONLY a valid JSON array (no markdown fences, no commentary), where each object has "
            f"the SAME \"id\" and a new \"translated\" field containing the translation. "
            f"Do not skip any id, and keep the array in the same order.\n\n"
            f"Input:\n{json.dumps(chunk, ensure_ascii=False)}"
        )
        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3}
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'x-goog-api-key': api_key}
        )

        for attempt in range(max_retries + 1):
            try:
                with urllib.request.urlopen(req) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    raw_text = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    parsed = _parse_json_array(raw_text)
                    for obj in parsed:
                        if "id" in obj and "translated" in obj:
                            translations[obj["id"]] = obj["translated"]
                    break
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8', errors='replace')
                if e.code in (429, 503) and attempt < max_retries:
                    if e.code == 429 and 'PerDay' in error_body:
                        print("Gemini daily quota habis, skip retry & fallback ke googletrans untuk batch ini")
                        break
                    wait = 4 * (attempt + 1)
                    if e.code == 429:
                        try:
                            err_json = json.loads(error_body)
                            for d in err_json.get("error", {}).get("details", []):
                                if d.get("@type", "").endswith("RetryInfo"):
                                    wait = float(d["retryDelay"].rstrip("s")) + 0.5
                        except Exception:
                            pass
                    print(f"Gemini batch {e.code}, retry in {wait:.1f}s (attempt {attempt+1}/{max_retries})")
                    time.sleep(wait)
                    continue
                print(f"Gemini batch API Error {e.code}: {error_body}")
                break
            except Exception as e:
                print(f"Gemini batch API Error: {e}")
                break

    return translations

def break_word(word, draw, font, max_width, target_lang):
    if len(word) <= 5:
        return [word]

    if target_lang == 'id':
        dic = dic_id
    elif target_lang == 'en':
        dic = dic_en
    else:
        dic = None

    if dic:
        syllables = dic.inserted(word).split('-')
    else:
        syllables = list(word)

    if len(syllables) <= 1 and len(word) > 3:
        syllables = list(word)

    lines = []
    current_part = ""
    for i, syl in enumerate(syllables):
        is_last_syl = (i == len(syllables) - 1)
        test_part = current_part + syl + ("" if is_last_syl else "-")
        bbox = draw.textbbox((0, 0), test_part, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            current_part += syl
        else:
            if not current_part:
                lines.append(syl + ("" if is_last_syl else "-"))
                current_part = ""
            else:
                lines.append(current_part + "-")
                current_part = syl
    if current_part:
        lines.append(current_part)
    return lines

def wrap_text(text, draw, font, max_width, target_lang):
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test_line = current_line + " " + word if current_line else word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
                current_line = ""
            
            bbox_word = draw.textbbox((0, 0), word, font=font)
            if (bbox_word[2] - bbox_word[0]) <= max_width:
                current_line = word
            else:
                broken_lines = break_word(word, draw, font, max_width, target_lang)
                if broken_lines:
                    lines.extend(broken_lines[:-1])
                    current_line = broken_lines[-1]
                else:
                    current_line = ""
    if current_line:
        lines.append(current_line)
    return lines

def extract_bubbles(image_path, ocr, index, translate_code, image_id):
    # YOLO + OCR
    img_cv = cv2.imread(image_path)
    img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
    img_pil = Image.fromarray(img_rgb)
    draw = ImageDraw.Draw(img_pil)

    results = model(img_rgb)
    detections = results.pandas().xyxy[0]

    bubbles = []
    for bubble_idx, (_, row) in enumerate(detections.iterrows()):
        x1, y1, x2, y2 = map(int, [row['xmin'], row['ymin'], row['xmax'], row['ymax']])
        orig_box_width = x2 - x1
        orig_box_height = y2 - y1
        cropped = img_pil.crop((x1, y1, x2, y2))

        if index == 0:
            text = ocr(cropped) or ""
        else:
            cropped_np = np.array(cropped)
            result = ocr.readtext(cropped_np, detail=0)
            text = " ".join(result) or ""

        cleaned_text = clean_ocr_text(text) or ""

        bubbles.append({
            "id": f"{image_id}_{bubble_idx}",
            "x1": x1, "y1": y1, "x2": x2, "y2": y2,
            "orig_box_width": orig_box_width,
            "orig_box_height": orig_box_height,
            "ocr_text": text,
            "cleaned_text": cleaned_text,
        })

    return img_pil, draw, bubbles

def render_bubbles(img_pil, draw, bubbles, translations, targetLang,
                    font_path="static/fonts/Winky_Rough/WinkyRough-Regular.ttf"):
    for b in bubbles:
        cleaned_text = b["cleaned_text"]
        if cleaned_text.strip():
            translated = translations.get(b["id"]) or "[Teks tidak terbaca]"
            translated = re.sub(r'\bLai\b', '!', translated)
            translated = translated.replace('．', '.').replace('…', '...').replace('。', '.')
            translated = re.sub(r'([.?!])([a-zA-Z])', r'\1 \2', translated)
        else:
            translated = "[Teks tidak terbaca]"

        print("OCR Result:", b["ocr_text"])
        print("Cleaned Text:", cleaned_text)
        print("Translated:", translated)

        x1, y1, x2, y2 = b["x1"], b["y1"], b["x2"], b["y2"]
        orig_box_width = b["orig_box_width"]
        orig_box_height = b["orig_box_height"]

        expansion_x = int(orig_box_width * 0.05)
        x1_new = max(0, x1 - expansion_x)
        x2_new = min(img_pil.width, x2 + expansion_x)
        box_width = x2_new - x1_new
        box_height = orig_box_height

        padding = min(8, box_width // 10)
        avail_width = max(10, box_width - padding * 2)
        avail_height = max(10, box_height - padding * 2)

        font_size = 100
        while font_size > 12:
            font = ImageFont.truetype(font_path, font_size)
            lines = wrap_text(translated, draw, font, avail_width, targetLang)
            line_spacing_factor = 1.05

            ascent, descent = font.getmetrics()
            line_height = int((ascent + descent) * line_spacing_factor)
            total_height = line_height * len(lines)

            max_line_width = 0
            for line in lines:
                bbox = draw.textbbox((0, 0), line, font=font)
                w = bbox[2] - bbox[0]
                if w > max_line_width:
                    max_line_width = w

            if total_height <= avail_height and max_line_width <= avail_width:
                break
            font_size -= 1

        font = ImageFont.truetype(font_path, font_size)
        lines = wrap_text(translated, draw, font, avail_width, targetLang)
        ascent, descent = font.getmetrics()
        line_height = int((ascent + descent) * 1.05)
        total_height = line_height * len(lines)

        # Determine the text's actual bounding box to draw a tight white background
        center_x = x1_new + box_width // 2
        text_x_min = center_x - max_line_width // 2
        text_x_max = center_x + max_line_width // 2
        
        center_y = y1 + box_height // 2
        text_y_min = center_y - total_height // 2
        text_y_max = center_y + total_height // 2
        
        padding_leak = 3 
        x1_box = max(0, min(x1, text_x_min - padding_leak))
        x2_box = min(img_pil.width, max(x2, text_x_max + padding_leak))
        y1_box = max(0, min(y1, text_y_min - padding_leak))
        y2_box = min(img_pil.height, max(y2, text_y_max + padding_leak))

        draw.rectangle([x1_box, y1_box, x2_box, y2_box], fill="white")

        current_y = y1 + (box_height - total_height) // 2
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_width = bbox[2] - bbox[0]
            text_x = x1_new + (box_width - line_width) // 2
            draw.text((text_x, current_y), line, font=font, fill="black")
            current_y += line_height