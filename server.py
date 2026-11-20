from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app) # Allows React to talk to Python

FILE_PATH = 'results.json'

@app.route('/save-result', methods=['POST'])
def save_result():
    new_result = request.json
    
    # Read existing data
    data = []
    if os.path.exists(FILE_PATH):
        with open(FILE_PATH, 'r') as f:
            try:
                data = json.load(f)
            except:
                data = []
                
    # Append new game result
    data.append(new_result)
    
    # Write back to the file
    with open(FILE_PATH, 'w') as f:
        json.dump(data, f, indent=2)
        
    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    app.run(port=5000)