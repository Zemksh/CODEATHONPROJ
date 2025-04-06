from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import csv
import os
import re
from datetime import datetime

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
    # Path to transaction history CSV
TRANSACTION_CSV_PATH = "../static/transaction_history.csv"
BLOCKED_VENDORS_PATH = "3/blocked_vendors.csv"

# Initialize transaction history CSV if it doesn't exist
def initialize_transaction_csv():
    if not os.path.exists(TRANSACTION_CSV_PATH):
        with open(TRANSACTION_CSV_PATH, "w", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([
                "transaction_id", 
                "vendor_id", 
                "amount_transferred", 
                "day_transferred", 
                "week_transferred", 
                "category", 
                "classification"
            ])

# Check if a vendor is in the blocked list
def is_vendor_blocked(vendor_id):
    if not os.path.exists(BLOCKED_VENDORS_PATH):
        return False
        
    with open(BLOCKED_VENDORS_PATH, "r", newline="") as file:
        reader = csv.reader(file)
        blocked_vendors = [row[0].lower() for row in reader]
        
    return vendor_id.lower() in blocked_vendors

# Classify transaction as need or want
def classify_transaction(category):
    needs = ['food', 'medical']
    wants = ['clothing', 'gadgets']
    
    if category.lower() in needs:
        return 'need'
    elif category.lower() in wants:
        return 'want'
    else:
        return 'uncategorized'

# Generate transaction ID
def generate_transaction_id():
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    # Count existing transactions to increment ID
    transaction_count = 0
    if os.path.exists(TRANSACTION_CSV_PATH):
        with open(TRANSACTION_CSV_PATH, "r", newline="") as file:
            reader = csv.reader(file)
            # Skip header
            next(reader, None)
            transaction_count = sum(1 for _ in reader)
    
    return f"TXN{timestamp}-{transaction_count + 1}"

# Get current day and week (simplified for demo)
def get_day_and_week():
    # This is a simple implementation - in a real app you might track actual dates
    if os.path.exists(TRANSACTION_CSV_PATH):
        with open(TRANSACTION_CSV_PATH, "r", newline="") as file:
            reader = csv.reader(file)
            # Skip header
            next(reader, None)
            # Count unique days and calculate week
            days = set()
            for row in reader:
                if len(row) >= 4:  # Make sure row has enough elements
                    days.add(row[3])  # day_transferred column
            
            current_day = f"day {len(days) + 1}"
            current_week = (len(days) // 7) + 1
            return current_day, current_week
    
    # Default if no transactions exist
    return "day 1", 1

# Save transaction to CSV
def save_transaction(transaction_data):
    with open(TRANSACTION_CSV_PATH, "a", newline="") as file:
        writer = csv.writer(file)
        writer.writerow([
            transaction_data["transaction_id"],
            transaction_data["vendor_id"],
            transaction_data["amount"],
            transaction_data["day"],
            transaction_data["week"],
            transaction_data["category"],
            transaction_data["classification"]
        ])

# Add these routes to your Flask app

@app.route('/static/test-payment.html')
def test_payment_page():
    return render_template('test-payment.html')

@app.route('/check_vendor', methods=['POST'])
def check_vendor():
    data = request.get_json()
    vendor_id = data.get('vendor_id', '')
    
    blocked = is_vendor_blocked(vendor_id)
    
    return jsonify({
        'blocked': blocked,
        'vendor_id': vendor_id
    })

@app.route('/process_payment', methods=['POST'])
def process_payment():
    # Initialize CSV if needed
    initialize_transaction_csv()
    
    data = request.get_json()
    vendor_id = data.get('vendor_id', '')
    amount = data.get('amount', 0)
    category = data.get('category', 'uncategorized')
    
    # Check if vendor is blocked
    if is_vendor_blocked(vendor_id):
        return jsonify({
            'success': False,
            'message': f'Payment blocked! Vendor {vendor_id} is in your blocked list.'
        })
    
    # Get current day and week
    current_day, current_week = get_day_and_week()
    
    # Create transaction data
    transaction_data = {
        "transaction_id": generate_transaction_id(),
        "vendor_id": vendor_id,
        "amount": amount,
        "day": current_day,
        "week": current_week,
        "category": category,
        "classification": classify_transaction(category)
    }
    
    # Save to CSV
    save_transaction(transaction_data)
    
    return jsonify({
        'success': True,
        'message': f'Payment of ₹{amount} to {vendor_id} processed successfully for {category} ({transaction_data["classification"]}).',
        'transaction': transaction_data
    })

# Make sure to add this to your app's initialization
if __name__ == "__main__":
    initialize_transaction_csv()
    app.run(debug=True)