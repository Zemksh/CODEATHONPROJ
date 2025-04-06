from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import csv
import os
import re
from datetime import datetime

app = Flask(__name__, static_folder="static")

API_KEY = "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"
MODEL = "mistralai/mistral-7b-instruct:free"

# Path to transaction history CSV and blocked vendors
TRANSACTION_CSV_PATH = "static/transaction_history.csv"
BLOCKED_VENDORS_PATH = "3/blocked_vendors.csv"

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

# Initialize transaction history CSV if it doesn't exist
def initialize_transaction_csv():
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(TRANSACTION_CSV_PATH), exist_ok=True)
    
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

# Initialize blocked vendors CSV if it doesn't exist
def initialize_blocked_vendors_csv():
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(BLOCKED_VENDORS_PATH), exist_ok=True)
    
    if not os.path.exists(BLOCKED_VENDORS_PATH):
        with open(BLOCKED_VENDORS_PATH, "w", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(["Vendor"])

# Check if a vendor is in the blocked list
def is_vendor_blocked(vendor_id):
    if not os.path.exists(BLOCKED_VENDORS_PATH):
        return False
        
    with open(BLOCKED_VENDORS_PATH, "r", newline="") as file:
        reader = csv.reader(file)
        next(reader, None)  # Skip header
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

# Get current day and week 
def get_day_and_week():
    # Check if there's a day tracking file
    day_tracker_path = "3/day_tracker.txt"
    if os.path.exists(day_tracker_path):
        with open(day_tracker_path, "r") as file:
            try:
                day, week = map(int, file.read().strip().split(","))
                return day, week
            except:
                pass
    
    # Default to day 1, week 1 if no file exists
    with open(day_tracker_path, "w") as file:
        file.write("1,1")
    return 1, 1

# Update day and week counter
def update_day():
    day, week = get_day_and_week()
    day += 1
    if day > 7:
        week += 1
        day = 1
    
    # Save updated values
    with open("3/day_tracker.txt", "w") as file:
        file.write(f"{day},{week}")
    
    return day, week

# Save transaction to CSV
def save_to_csv(transaction_data):
    # Make sure directory exists
    os.makedirs(os.path.dirname(TRANSACTION_CSV_PATH), exist_ok=True)
    
    # Check if file exists to determine if we need headers
    file_exists = os.path.isfile(TRANSACTION_CSV_PATH)
    
    with open(TRANSACTION_CSV_PATH, "a", newline="") as file:
        writer = csv.writer(file)
        
        # Write header if file is new
        if not file_exists:
            writer.writerow([
                "transaction_id", 
                "vendor_id", 
                "amount_transferred", 
                "day_transferred", 
                "week_transferred", 
                "category", 
                "classification"
            ])
        
        # Write the transaction data
        writer.writerow([
            transaction_data["transaction_id"],
            transaction_data["vendor_id"],
            transaction_data["amount"],
            transaction_data["day"],
            transaction_data["week"],
            transaction_data["category"],
            transaction_data["classification"]
        ])
    
    print(f"✅ Transaction saved to CSV: {transaction_data['transaction_id']}")
    return True

# New function to write transaction with simplified parameters
def write_transaction_to_csv(vendor_id, amount_paid, day_week_of_payment):
    """
    Writes transaction data to the transaction_history.csv file with simplified parameters.
    
    Parameters:
    vendor_id (str): The vendor ID or name
    amount_paid (float): The amount paid in the transaction
    day_week_of_payment (str): String in format "day,week" (e.g., "3,2" for Day 3, Week 2)
    
    Returns:
    bool: True if successful, False otherwise
    """
    # Path to the CSV file
    csv_path = TRANSACTION_CSV_PATH
    
    # Make sure the directory exists
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    
    # Check if file exists to determine if headers are needed
    file_exists = os.path.isfile(csv_path)
    
    try:
        # Parse day and week from input string
        day, week = map(int, day_week_of_payment.split(','))
        
        # Generate a transaction ID
        transaction_id = generate_transaction_id()
        
        # Open file in append mode
        with open(csv_path, "a", newline="") as file:
            writer = csv.writer(file)
            
            # Write header if file is new
            if not file_exists:
                writer.writerow([
                    "transaction_id", 
                    "vendor_id", 
                    "amount_transferred", 
                    "day_transferred", 
                    "week_transferred", 
                    "category", 
                    "classification"
                ])
            
            # Write the transaction data
            writer.writerow([
                transaction_id,
                vendor_id,
                amount_paid,
                day,
                week,
                "uncategorized",  # Default category
                "uncategorized"   # Default classification
            ])
        
        print(f"✅ Transaction saved to CSV: {transaction_id}")
        return True
        
    except Exception as e:
        print(f"❌ Error saving transaction to CSV: {e}")
        return False

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
        # Initialize if needed
        initialize_blocked_vendors_csv()
        
        # Log blocked vendor to CSV
        with open(BLOCKED_VENDORS_PATH, "a", newline="") as file:
            writer = csv.writer(file)
            writer.writerow([vendor+"@upi"])
        print(f"✅ Blocked vendor added to CSV: {vendor}")

        reply = f"🛑 Vendor '{vendor}' has been blocked successfully!"
    else:
        reply = chat_with_openrouter(user_input)

    return jsonify({"reply": reply})

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
    
    # Get current day and week
    day, week = get_day_and_week()
    
    # Create transaction data
    transaction_data = {
        "transaction_id": generate_transaction_id(),
        "vendor_id": vendor_id,
        "amount": amount,
        "day": day,
        "week": week,
        "category": category,
        "classification": classify_transaction(category)
    }
    
    # Save to CSV
    save_to_csv(transaction_data)
    
    return jsonify({
        'success': True,
        'message': f'Payment of ₹{amount} to {vendor_id} processed successfully for {category} ({transaction_data["classification"]}).',
        'transaction': transaction_data
    })

@app.route('/save-transaction', methods=['POST'])
def save_transaction():
    data = request.json
    transaction = data['data']
    
    # Save to the transaction history CSV
    success = save_to_csv(transaction)
    
    return jsonify({
        "success": success, 
        "message": "Transaction saved to CSV"
    })

@app.route('/update-day', methods=['POST'])
def advance_day():
    day, week = update_day()
    
    return jsonify({
        'success': True,
        'day': day,
        'week': week,
        'message': f'Advanced to Day {day}, Week {week}'
    })

# New endpoint for the simplified transaction writing
@app.route('/write_transaction', methods=['POST'])
def write_transaction():
    data = request.get_json()
    vendor_id = data.get('vendor_id', '')
    amount_paid = data.get('amount_paid', 0)
    
    # Get current day and week if not provided
    if 'day_week_of_payment' in data:
        day_week = data.get('day_week_of_payment')
    else:
        day, week = get_day_and_week()
        day_week = f"{day},{week}"
    
    success = write_transaction_to_csv(vendor_id, amount_paid, day_week)
    
    return jsonify({
        'success': success,
        'message': 'Transaction written to CSV' if success else 'Failed to write transaction'
    })

if __name__ == "__main__":
    # Initialize files
    initialize_transaction_csv()
    initialize_blocked_vendors_csv()
    
    # Make sure day tracker exists
    if not os.path.exists("3/day_tracker.txt"):
        with open("3/day_tracker.txt", "w") as file:
            file.write("1,1")
    
    app.run(debug=True) 