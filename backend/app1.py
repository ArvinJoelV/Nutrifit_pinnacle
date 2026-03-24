import os
import re
import json
from flask import Flask, request, render_template
from PIL import Image
import google.generativeai as genai
from detector import process_image

# Gemini Setup
GOOGLE_API_KEY = 'APIkey'  # Replace with your actual API key
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')

# Flask Setup
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['CROPPED_FOLDER'] = 'static/cropped_mask'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['CROPPED_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('index2.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return "No image uploaded", 400

    image_file = request.files['image']
    if image_file.filename == '':
        return "No selected file", 400

    image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_file.filename)
    image_file.save(image_path)

    cropped_paths, masked_paths = process_image(image_path)
    analysis_results = []

    prompt = """
    You are a nutrition analysis AI. Given this image of a food item, identify the food and return the result strictly in JSON format.
    {
      "name": "Food Item Name",
      "calories": 123,
      "carbohydrates": 20,
      "proteins": 10,
      "fats": 5
    }
    """

    for path in cropped_paths:
        try:
            img = Image.open(path)
            response = model.generate_content([prompt, img])
            raw_json = response.text.strip()
            clean_json = re.sub(r"```json|```", "", raw_json).strip()
            data = json.loads(clean_json)

            analysis_results.append({
                "image": path.replace("\\", "/").replace("static/", ""),
                "data": data
            })
        except Exception as e:
            analysis_results.append({
                "image": path.replace("\\", "/").replace("static/", ""),
                "data": {"name": "Error", "calories": 0, "carbohydrates": 0, "proteins": 0, "fats": 0, "error": str(e)}
            })

    # Convert masked paths to a format usable in HTML
    masked_images = [path.replace("\\", "/").replace("static/", "") for path in masked_paths]
    print(ana)
    return render_template('index2.html', results=analysis_results, masked_images=masked_images)

if __name__ == '__main__':
    app.run(debug=True, port=3000)
