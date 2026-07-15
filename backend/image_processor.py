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
        "jp": ("jp", "ja"), # Jepang
        "ko": ("ko", "ko"), # Korea
        "ch_sim": ("ch_sim", "zh-cn"), # Simplified Mandarin
        "ch_tra": ("ch_tra", "zh-tw"), # Traditional Mandarin
        "en": ("en", "en") # Inggris
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

def break_word(word, draw, font, max_width, target_lang):
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

def process_image(image_path, ocr, index, translate_code, targetLang):
    img_cv = cv2.imread(image_path)
    img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
    img_pil = Image.fromarray(img_rgb)
    draw = ImageDraw.Draw(img_pil)

    results = model(img_rgb)
    detections = results.pandas().xyxy[0]
    font_path = "static/fonts/Winky_Rough/WinkyRough-Regular.ttf"

    for _, row in detections.iterrows():
        x1, y1, x2, y2 = map(int, [row['xmin'], row['ymin'], row['xmax'], row['ymax']])
        
        # Original width for cropping (so OCR reads the exact YOLO box)
        orig_box_width = x2 - x1
        orig_box_height = y2 - y1
        cropped = img_pil.crop((x1, y1, x2, y2))
        
        if (index == 0):
            text = ocr(cropped) or ""
        else:
            cropped_np = np.array(cropped)
            result = ocr.readtext(cropped_np, detail=0)
            text = " ".join(result) or ""

        cleaned_text = clean_ocr_text(text) or ""

        if cleaned_text.strip():
            translated = translator.translate(cleaned_text, src=translate_code, dest=targetLang).text
            translated = re.sub(r'\bLai\b', '!', translated)
            translated = translated.replace('．', '.').replace('…', '...').replace('。', '.')
            # Add space after punctuation if followed directly by a letter (avoids decimals like 3.14)
            translated = re.sub(r'([.?!])([a-zA-Z])', r'\1 \2', translated)
        else:
            translated = "[Teks tidak terbaca]"

        print("OCR Result:", text)
        print("Cleaned Text:", cleaned_text)
        print("Translated:", translated)

        # Expand threshold by 10% horizontally (5% left, 5% right)
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
        
        # After loop, ensure we use the finalized font and lines
        font = ImageFont.truetype(font_path, font_size)
        lines = wrap_text(translated, draw, font, avail_width, targetLang)
        ascent, descent = font.getmetrics()
        line_height = int((ascent + descent) * 1.05)
        total_height = line_height * len(lines)

        draw.rectangle([x1_new, y1, x2_new, y2], fill="white")

        current_y = y1 + (box_height - total_height) // 2
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_width = bbox[2] - bbox[0]
            text_x = x1_new + (box_width - line_width) // 2
            draw.text((text_x, current_y), line, font=font, fill="black")
            current_y += line_height

    return img_pil