import os
import json
from flask import Flask, request, jsonify, render_template
from PIL import Image
import google.generativeai as genai

# Configure Gemini
GOOGLE_API_KEY = 'APIkey'
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')

# Flask setup
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# HTML route
@app.route('/')
def index():
    return render_template('index.html')

# Analyze route
@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_file.filename)
    image_file.save(image_path)

    # Open image
    image = Image.open(image_path)

    # Prompt to Gemini
    prompt = """
    You are a nutrition analysis AI. Given this image of a food plate, identify all the individual food items and return the result strictly in JSON format.

    For each item, provide:
    - "name": Name of the food item
    - "calories": Estimated calories (in kcal)
    - "carbohydrates": Carbs (in grams)
    - "proteins": Proteins (in grams)
    - "fats": Fats (in grams)

    Also, return a "summary" object at the end:
    - "total_calories"
    - "total_carbohydrates"
    - "total_proteins"
    - "total_fats"

    Make sure your output is pure JSON with double quotes, and no explanation outside the JSON block.
    """

    try:
        # Request the Gemini model to analyze the image
        response = model.generate_content([prompt, image])
        response_text = response.text.strip()
        print(response_text)
        # The Gemini response will be in JSON format, so we can directly return the response
        return render_template('index.html', result=response_text)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
