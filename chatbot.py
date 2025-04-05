import re
from flask import Flask, request, jsonify, send_from_directory
import requests
import csv
import os

app = Flask(__name__)

API_KEY = "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"  # Replace with your actual OpenRouter API key
MODEL = "mistralai/mistral-7b-instruct:free"

# Extract vendor name if user says "block vendor"
def extract_vendor(user_input):
    match = re.search(r"block\s+(\w+)", user_input.lower())
    if match:
        return match.group(1).capitalize()
    return None

# Call OpenRouter to get AI response
def chat_with_openrouter(user_input):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You're a smart and friendly finance assistant. Help the user with finance tips, budgets, and blocking vendors only when asked clearly."},
            {"role": "user", "content": user_input}
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        print("❌ Error calling OpenRouter:", e)
        return "❌ Couldn't contact AI service. Please try again."

# Serve index.html
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

# Chat endpoint
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")
    print("🔁 User input:", user_input)

    vendor = extract_vendor(user_input)
    if vendor:
        # Log blocked vendor to CSV
        with open("blocked_vendors.csv", "a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([vendor])
        print(f"✅ Blocked vendor added to CSV: {vendor}")

        reply = f"🛑 Vendor '{vendor}' has been blocked successfully!"
    else:
        reply = chat_with_openrouter(user_input)

    return jsonify({"reply": reply})

# Initialize CSV if it doesn't exist
if __name__ == "__main__":
    if not os.path.exists("blocked_vendors.csv"):
        with open("blocked_vendors.csv", "w", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(["Vendor"])
    app.run(debug=True)
