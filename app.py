from flask import Flask, request, jsonify, send_file, render_template, send_from_directory
from flask_cors import CORS
import qrcode
import qrcode.image.svg
from io import BytesIO
import base64
from datetime import datetime
import os

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Create uploads directory if it doesn't exist
os.makedirs('uploads', exist_ok=True)

@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve static files (CSS, JS)"""
    return send_from_directory('.', path)

def detect_data_type(text):
    """Detect the type of data in the text"""
    if text.startswith(('http://', 'https://')):
        return 'URL'
    elif text.startswith('mailto:'):
        return 'Email'
    elif text.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').isdigit():
        return 'Phone Number'
    elif text.startswith('WIFI:'):
        return 'WiFi Network'
    elif text.isdigit():
        return 'Numbers'
    else:
        return 'Text'

@app.route('/generate-qr', methods=['POST'])
def generate_qr():
    """Generate QR code with various options"""
    try:
        data = request.json
        text = data.get('text', '').strip()
        size = int(data.get('size', 300))
        qr_color = data.get('qr_color', '#000000')
        bg_color = data.get('bg_color', '#ffffff')
        error_correction = data.get('error_correction', 'M')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Map error correction levels
        ecc_map = {
            'L': qrcode.constants.ERROR_CORRECT_L,
            'M': qrcode.constants.ERROR_CORRECT_M,
            'Q': qrcode.constants.ERROR_CORRECT_Q,
            'H': qrcode.constants.ERROR_CORRECT_H
        }
        
        ecc_level = ecc_map.get(error_correction, qrcode.constants.ERROR_CORRECT_M)
        
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=ecc_level,
            box_size=10,
            border=4,
        )
        qr.add_data(text)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color=qr_color, back_color=bg_color)
        
        # Resize image
        img = img.resize((size, size))
        
        # Convert to bytes
        img_byte_arr = BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Convert to base64 for frontend
        img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
        
        # Prepare response
        response = {
            'success': True,
            'qr_code': f'data:image/png;base64,{img_base64}',
            'info': {
                'type': detect_data_type(text),
                'size': f'{size}x{size}',
                'created': datetime.now().isoformat(),
                'data_length': len(text),
                'error_correction': error_correction
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate-svg', methods=['POST'])
def generate_svg():
    """Generate SVG QR code"""
    try:
        data = request.json
        text = data.get('text', '').strip()
        size = int(data.get('size', 300))
        qr_color = data.get('qr_color', '#000000').lstrip('#')
        bg_color = data.get('bg_color', '#ffffff').lstrip('#')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Create SVG factory
        factory = qrcode.image.svg.SvgPathImage
        
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
            image_factory=factory
        )
        qr.add_data(text)
        qr.make(fit=True)
        
        # Create SVG image
        img = qr.make_image(fill_color=qr_color, back_color=bg_color)
        
        # Get SVG string
        svg_bytes = BytesIO()
        img.save(svg_bytes)
        svg_str = svg_bytes.getvalue().decode('utf-8')
        
        # Add size attributes
        svg_str = svg_str.replace(
            '<svg', 
            f'<svg width="{size}" height="{size}" viewBox="0 0 {img.width} {img.height}"'
        )
        
        return svg_str, 200, {'Content-Type': 'image/svg+xml'}
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate-audio', methods=['POST'])
def generate_audio():
    """Generate audio from text (text-to-speech)"""
    try:
        data = request.json
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        if len(text) > 1000:
            return jsonify({'error': 'Text too long for audio generation'}), 400
        
        # Note: In a production environment, you would use a TTS service here
        # For example: Google Text-to-Speech, AWS Polly, etc.
        
        # For demo purposes, we'll return a placeholder response
        response = {
            'success': True,
            'message': 'Audio generation would be implemented with a TTS service',
            'text_length': len(text)
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'QR Code Generator API'
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)