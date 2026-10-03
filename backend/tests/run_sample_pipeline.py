import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from food_portion.pipeline import FoodPortionPipeline

test_img = "static/visuals/stock-photo--medu-vada-a-popular-south-indian-food-served-with-sambar-green-coconut-chutney-vada-medu-1675667164.jpg"
print(f"Testing FoodPortionPipeline on: {test_img}")

pipeline = FoodPortionPipeline()
result = pipeline.process(test_img)

print("\n=== PIPELINE SUCCESS ===")
print("Total Mass (g):", result.get("total_mass_g"))
print("Total Calories (kcal):", result.get("totalCalories"))
print("Scale Calibration:", result.get("scale_calibration"))
print("Scene Assessment:", result.get("scene_assessment"))
print("Gemini Validation:", result.get("gemini_validation"))
print(f"\nDetected Items ({len(result.get('items', []))}):")
for item in result.get("items", []):
    print(f"  * {item['name']}:")
    print(f"      Mass: {item['mass_g']} g (Range: {item['mass_range_g']})")
    print(f"      Visible Area: {item['visible_area_cm2']} cm2 | Total: {item['estimated_total_area_cm2']} cm2")
    print(f"      Volume: {item['estimated_volume_cm3']} cm3")
    print(f"      Occlusion: {item['occlusion_probability']} | Confidence: {item['confidence']}")
    print(f"      Macros: {item['calories']} kcal, {item['protein']}g P, {item['carbs']}g C, {item['fat']}g F")
