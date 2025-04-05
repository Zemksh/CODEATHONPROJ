# chatbot/intent_parser.py
import os, csv, re
import spacy, torch
from langchain_huggingface import HuggingFaceEmbeddings
from sentence_transformers.util import cos_sim


embedder = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
nlp = spacy.load("en_core_web_sm")

INTENT_EXAMPLES = {
    "block_vendor": [
        "block Zomato for 3 days",
        "stop payments to Amazon"
    ],
    "unblock_vendor": [
        "unblock Swiggy", "allow payments to Flipkart"
    ]
}

intent_vectors = {
    intent: [embedder.embed_query(example) for example in examples]
    for intent, examples in INTENT_EXAMPLES.items()
}

CSV_PATH = "../blocked_vendors.csv"

if not os.path.exists(CSV_PATH):
    with open(CSV_PATH, "w", newline="") as f:
        csv.writer(f).writerow(["vendor"])

def detect_intent(msg):
    input_vec = embedder.embed_query(msg)
    best_score, best_intent = -1, None
    for intent, vectors in intent_vectors.items():
        for vec in vectors:
            score = cos_sim(torch.tensor(input_vec), torch.tensor(vec)).item()
            if score > best_score:
                best_score = score
                best_intent = intent
    return best_intent

def extract_entities(msg):
    doc = nlp(msg)
    vendor= None
    for ent in doc.ents:
        if ent.label_ == "ORG": vendor = ent.text.title()
    if not vendor:
        match = re.search(r"(?:block|unblock)\s+(\w+)", msg.lower())
        if match: vendor = match.group(1).title()
    return vendor

def handle_message(message):
    intent = detect_intent(message)
    vendor, _ = extract_entities(message)  # discard duration

    if intent == "block_vendor" and vendor:
        with open(CSV_PATH, "a", newline="") as f:
            csv.writer(f).writerow([vendor])
        return f"✅ Blocked {vendor}."

    elif intent == "unblock_vendor" and vendor:
        return unblock_vendor(vendor)

    return "🤷 Sorry, I didn’t understand that."

def unblock_vendor(vendor_name):
    if not os.path.exists(CSV_PATH):
        return f"⚠️ No blocked vendors found."

    new_rows = []
    unblocked = False

    with open(CSV_PATH, "r", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            if row[0].lower() != vendor_name.lower():
                new_rows.append(row)
            else:
                unblocked = True

    with open(CSV_PATH, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(new_rows)

    return f"🔓 Unblocked {vendor_name}." if unblocked else f"❌ Vendor '{vendor_name}' not found in block list."
