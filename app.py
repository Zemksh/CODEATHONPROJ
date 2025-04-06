from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import csv
import os
import re

app = Flask(__name__, static_folder="static")

API_KEY = "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"
MODEL = "mistralai/mistral-7b-instruct:free"

# Extract vendor name if user says "block vendor"
def extract_vendor(user_input):
    match = re.search(r"block\s+(\w+)", user_input.lower())
    if match:
        return match.group(1).capitalize()
    return None

# Limit response to 100 words
def limit_words(text, max_words=100):
    words = text.split()
    if len(words) <= max_words:
        return text
    return ' '.join(words[:max_words]) + "..."

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
            {"role": "system", "content": "You're a smart and friendly finance assistant. Keep responses concise (under 100 words). Help the user with finance tips, budgets, and blocking vendors only when asked clearly."},
            {"role": "user", "content": user_input}
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        reply = result["choices"][0]["message"]["content"]
        # Apply additional word limit to be safe
        return limit_words(reply)
    except Exception as e:
        print("❌ Error calling OpenRouter:", e)
        return "❌ Couldn't contact AI service. Please try again."

@app.route('/')
def dashboard():
    user = {
        'name': 'Adil',
        'photo_url': '../static/images/profilepic.jpg'
    }
    return render_template('dashboard.html', user=user)

# Chat endpoint
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_input = data.get("message", "")
    print("🔁 User input:", user_input)

    vendor = extract_vendor(user_input)
    if vendor:
        # Log blocked vendor to CSV
        with open("3/blocked_vendors.csv", "a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([vendor+"@upi"])
        print(f"✅ Blocked vendor added to CSV: {vendor}")

        reply = f"🛑 Vendor '{vendor}' has been blocked successfully!"
    else:
        reply = chat_with_openrouter(user_input)

    return jsonify({"reply": reply})

if __name__ == "__main__":
    if not os.path.exists("3/blocked_vendors.csv"):
        with open("3/blocked_vendors.csv", "w", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(["Vendor"])
    app.run(debug=True)