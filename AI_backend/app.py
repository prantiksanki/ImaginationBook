import os
import io
import base64
import requests
import torch
from PIL import Image
from flask import Flask, request, jsonify, render_template_string
from pyngrok import ngrok, conf
from diffusers import DiffusionPipeline

load_dotenv()

# Flask app setup
app = Flask(__name__)

# Set ngrok auth token
NGROK_AUTH_TOKEN = os.getenv("NGROK_AUTH_TOKEN")
conf.get_default().auth_token = NGROK_AUTH_TOKEN

# Initialize models
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load text-to-image model
print("Loading text-to-image model...")
txt2img_pipeline = DiffusionPipeline.from_pretrained(
    "sd-legacy/stable-diffusion-v1-5",
    torch_dtype=torch.float16 if device == "cuda" else torch.float32
)
txt2img_pipeline.to(device)

# Environment variable
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    GROQ_API_KEY = getenv("GROQ_API_KEY")

# HTML interface
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Image Processing Service</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { margin-top: 20px; }
        input, button, textarea { padding: 10px; margin: 10px 0; }
        textarea { width: 100%; height: 100px; }
        .tab { overflow: hidden; border: 1px solid #ccc; background-color: #f1f1f1; }
        .tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 14px 16px; transition: 0.3s; }
        .tab button:hover { background-color: #ddd; }
        .tab button.active { background-color: #ccc; }
        .tabcontent { display: none; padding: 20px; border: 1px solid #ccc; border-top: none; }
        img { max-width: 100%; margin-top: 20px; }
        .hidden { display: none; }
        .images-container { display: flex; flex-wrap: wrap; gap: 20px; }
        .image-item { flex: 1; min-width: 300px; }
    </style>
</head>
<body>
    <h1>Image Processing Service</h1>
    
    <div class="tab">
        <button class="tablinks active" onclick="openTab(event, 'ImageProcess')">Process Image</button>
        <button class="tablinks" onclick="openTab(event, 'Text2Img')">Text to Image</button>
    </div>
    
    <div id="ImageProcess" class="tabcontent" style="display: block;">
        <h2>Upload & Process Image</h2>
        <form id="uploadForm" enctype="multipart/form-data">
            <input type="file" id="imageInput" accept="image/*">
            <button type="submit">Process Image</button>
        </form>
        <div id="loadingIndicator" class="hidden">
            <p>Processing... please wait</p>
        </div>
        <div id="result">
            <h3>Images:</h3>
            <div class="images-container">
                <div class="image-item">
                    <h4>Original Image:</h4>
                    <div id="originalImage"></div>
                </div>
                <div class="image-item">
                    <h4>Generated Image:</h4>
                    <div id="generatedImage"></div>
                </div>
            </div>
            <h3>Generated Prompt:</h3>
            <textarea id="generatedPrompt" readonly></textarea>
            <h3>Response:</h3>
            <pre id="responseText"></pre>
        </div>
    </div>
    
    <div id="Text2Img" class="tabcontent">
        <h2>Generate Image from Text</h2>
        <form id="textForm">
            <textarea id="promptInput" placeholder="Enter your prompt here (e.g., 'A fantasy landscape with mountains and a castle')"></textarea>
            <button type="submit">Generate Image</button>
        </form>
        <div id="textResult">
            <h3>Generated Image:</h3>
            <div id="textGeneratedImage"></div>
            <h3>Response:</h3>
            <pre id="textResponseText"></pre>
        </div>
    </div>

    <script>
        function openTab(evt, tabName) {
            var i, tabcontent, tablinks;
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";
        }

        document.getElementById('textForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const promptText = document.getElementById('promptInput').value;
            if (!promptText.trim()) {
                alert('Please enter a prompt');
                return;
            }
            
            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt: promptText })
                });

                const result = await response.json();
                document.getElementById('textResponseText').textContent = JSON.stringify(result, null, 2);

                if (result.image) {
                    const generatedImg = document.createElement('img');
                    generatedImg.src = 'data:image/png;base64,' + result.image;
                    document.getElementById('textGeneratedImage').innerHTML = '';
                    document.getElementById('textGeneratedImage').appendChild(generatedImg);
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('textResponseText').textContent = 'Error: ' + error.message;
            }
        });

        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            const fileInput = document.getElementById('imageInput');
            if (!fileInput.files[0]) {
                alert('Please select an image file');
                return;
            }
            
            formData.append('image', fileInput.files[0]);

            // Show original image
            const originalImg = document.createElement('img');
            originalImg.src = URL.createObjectURL(fileInput.files[0]);
            document.getElementById('originalImage').innerHTML = '';
            document.getElementById('originalImage').appendChild(originalImg);
            
            // Show loading indicator
            document.getElementById('loadingIndicator').classList.remove('hidden');

            try {
                const response = await fetch('/process', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                document.getElementById('responseText').textContent = JSON.stringify(result, null, 2);
                document.getElementById('generatedPrompt').value = result.prompt;

                if (result.image) {
                    const processedImg = document.createElement('img');
                    processedImg.src = 'data:image/png;base64,' + result.image;
                    document.getElementById('generatedImage').innerHTML = '';
                    document.getElementById('generatedImage').appendChild(processedImg);
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('responseText').textContent = 'Error: ' + error.message;
            } finally {
                // Hide loading indicator
                document.getElementById('loadingIndicator').classList.add('hidden');
            }
        });
    </script>
</body>
</html>
"""

def get_fancy_description_with_groq(image_bytes):
    """Process image with Groq and get a fancy 77-token description ending with 'artstation like'"""
    try:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Prompt specifically asks for a 77-token description ending with "artstation like"
        prompt_text = """
        Look at this image and generate a high-quality, fancy prompt description in exactly 60 words.
        
        If the image contains drawings, illustrations or artwork: describe the key elements with a fancy touch, do not mention word
        simple, normal and something that make that image childish.
        
        If the image contains text: describe the content represented by the text in a creative way in 60 words.
        
        Always end your description with the phrase "artstation like".
        
        Make it detailed and vivid, suitable for generating a high-quality artistic image with text-to-image AI. and try to as 
        """
        
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            "model": "meta-llama/llama-4-maverick-17b-128e-instruct"
        }
        
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            description = result["choices"][0]["message"]["content"].strip()
            
            # Ensure it ends with "artstation like" if it doesn't already
            if not description.lower().endswith("artstation like"):
                description += ", current trending"
                
            return description
        else:
            print(f"Groq API error: {response.status_code} - {response.text}")
            return "Ethereal fantasy landscape with vibrant colors and dramatic lighting, artstation like"
    except Exception as e:
        print(f"Exception during Groq analysis: {e}")
        return "Mystical digital artwork with detailed textures and surreal elements, artstation like"

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/process', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    try:
        image_file = request.files['image']
        image_bytes = image_file.read()
        
        # Get fancy description from Groq
        fancy_description = get_fancy_description_with_groq(image_bytes)
        
        # Generate new image from the description
        result_img = txt2img_pipeline(
            prompt=fancy_description,
            num_inference_steps=30,
            guidance_scale=7.5
        ).images[0]
        
        # Convert result to base64
        buf = io.BytesIO()
        result_img.save(buf, format="PNG")
        img_b64 = base64.b64encode(buf.getvalue()).decode()
        
        return jsonify({
            "message": "Image processed successfully",
            "prompt": fancy_description,
            "image": img_b64
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate', methods=['POST'])
def generate_image():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        
        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400
            
        # Generate image from text
        result_img = txt2img_pipeline(
            prompt=prompt,
            num_inference_steps=30,
            guidance_scale=7.5
        ).images[0]
        
        # Convert image to base64
        buf = io.BytesIO()
        result_img.save(buf, format="PNG")
        img_b64 = base64.b64encode(buf.getvalue()).decode()
        
        return jsonify({
            "message": f"Image generated from prompt: {prompt}",
            "image": img_b64
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def start_ngrok():
    http_tunnel = ngrok.connect(5000)
    ngrok_url = http_tunnel.public_url
    print(f" * Ngrok tunnel running at: {ngrok_url}")
    return ngrok_url

if __name__ == "__main__":
    # Start ngrok
    public_url = start_ngrok()
    print(f"Add this URL to your webpage button: {public_url}/process")

    # Start Flask app
    app.run(host="0.0.0.0", port=6000)