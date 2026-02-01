// DOM Elements
const qrInput = document.getElementById('qr-input');
const qrSize = document.getElementById('qr-size');
const errorCorrection = document.getElementById('error-correction');
const qrColor = document.getElementById('qr-color');
const bgColor = document.getElementById('bg-color');
const generateBtn = document.getElementById('generate-btn');
const resetBtn = document.getElementById('reset-btn');
const qrCanvas = document.getElementById('qr-canvas');
const qrImage = document.getElementById('qr-image');
const qrPlaceholder = document.getElementById('qr-placeholder');
const downloadPng = document.getElementById('download-png');
const downloadSvg = document.getElementById('download-svg');
const charCount = document.getElementById('char-count');
const exampleBtns = document.querySelectorAll('.example-btn');
const previewAudioBtn = document.getElementById('preview-audio');
const voiceSpeed = document.getElementById('voice-speed');
const successModal = document.getElementById('success-modal');
const closeModal = document.querySelector('.close-modal');
const modalOk = document.getElementById('modal-ok');

// QR Code Information Elements
const infoType = document.getElementById('info-type');
const infoSize = document.getElementById('info-size');
const infoDate = document.getElementById('info-date');
const infoLength = document.getElementById('info-length');

// Initialize
let currentQRData = null;
let isBackendAvailable = false;

// Character Counter
qrInput.addEventListener('input', () => {
    charCount.textContent = qrInput.value.length;
});

// Example Buttons
exampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        qrInput.value = btn.dataset.example;
        charCount.textContent = qrInput.value.length;
    });
});

// Reset Button - Fixed version
resetBtn.addEventListener('click', () => {
    // Clear input
    qrInput.value = '';
    
    // Reset character count
    charCount.textContent = '0';
    
    // Show placeholder and hide QR code
    qrImage.style.display = 'none';
    qrPlaceholder.style.display = 'block';
    qrPlaceholder.innerHTML = '<i class="fas fa-qrcode"></i><p>Your QR code will appear here</p>';
    
    // Clear canvas
    const ctx = qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    
    // Reset colors to default
    qrColor.value = '#000000';
    bgColor.value = '#ffffff';
    qrSize.value = '300';
    errorCorrection.value = 'M';
    voiceSpeed.value = '1';
    
    // Reset audio
    window.speechSynthesis && window.speechSynthesis.cancel();
    
    // Reset QR info
    resetQRInfo();
    
    // Clear current QR data
    currentQRData = null;
    
    // Reset generate button
    generateBtn.classList.remove('loading');
    generateBtn.disabled = false;
    
    console.log('Reset completed');
});

// Generate QR Code
generateBtn.addEventListener('click', async () => {
    const text = qrInput.value.trim();
    
    if (!text) {
        alert('Please enter some text to generate QR code');
        return;
    }
    
    try {
        // Disable button and show loading
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;
        
        // Show loading state
        qrPlaceholder.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Generating QR Code...</p>';
        qrPlaceholder.style.display = 'block';
        qrImage.style.display = 'none';
        
        // Try backend first, fallback to frontend
        try {
            await generateQRCodeWithBackend(text);
        } catch (backendError) {
            console.log('Backend failed, using client-side generation:', backendError);
            await generateQRCodeClientSide(text);
        }
        
        // Update QR code information
        updateQRInfo(text);
        
        // Show success message
        setTimeout(() => {
            showModal();
        }, 500);
        
    } catch (error) {
        console.error('Error generating QR code:', error);
        alert('Error generating QR code. Please try again.\n' + error.message);
        
        // Restore placeholder
        qrPlaceholder.innerHTML = '<i class="fas fa-qrcode"></i><p>Your QR code will appear here</p>';
        qrPlaceholder.style.display = 'block';
    } finally {
        // Restore button state
        generateBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate QR Code';
        generateBtn.disabled = false;
        generateBtn.classList.remove('loading');
    }
});

// Generate QR Code with Backend
async function generateQRCodeWithBackend(text) {
    const size = parseInt(qrSize.value);
    const color = qrColor.value;
    const bg = bgColor.value;
    const ecc = errorCorrection.value;
    
    const response = await fetch('http://127.0.0.1:5000/generate-qr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: text,
            size: size,
            qr_color: color,
            bg_color: bg,
            error_correction: ecc
        })
    });
    
    if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
        // Display QR code from backend
        qrImage.src = data.qr_code;
        qrImage.style.display = 'block';
        qrCanvas.style.display = 'none';
        qrPlaceholder.style.display = 'none';
        
        currentQRData = data.qr_code;
        
        // Update QR info from backend response
        infoType.textContent = data.info.type;
        infoSize.textContent = data.info.size;
        infoDate.textContent = new Date(data.info.created).toLocaleString();
        infoLength.textContent = `${data.info.data_length} characters`;
    } else {
        throw new Error(data.error || 'Failed to generate QR code');
    }
}

// Generate QR Code Client Side (Fallback)
function generateQRCodeClientSide(text) {
    return new Promise((resolve, reject) => {
        try {
            const size = parseInt(qrSize.value);
            const color = qrColor.value;
            const bg = bgColor.value;
            const ecc = errorCorrection.value;
            
            // Check if QRCode library is available
            if (typeof QRCode === 'undefined') {
                throw new Error('QRCode library not loaded. Please check your internet connection.');
            }
            
            // Clear previous QR code
            const container = document.createElement('div');
            container.style.display = 'none';
            document.body.appendChild(container);
            
            // Generate QR code using QRCode library
            const qr = new QRCode(container, {
                text: text,
                width: size,
                height: size,
                colorDark: color,
                colorLight: bg,
                correctLevel: getCorrectLevel(ecc)
            });
            
            // Wait a moment for QR code to generate
            setTimeout(() => {
                const img = container.querySelector('img');
                if (img && img.src) {
                    qrImage.src = img.src;
                    qrImage.style.display = 'block';
                    qrPlaceholder.style.display = 'none';
                    qrCanvas.style.display = 'none';
                    
                    currentQRData = img.src;
                    
                    // Clean up
                    container.remove();
                    
                    resolve();
                } else {
                    // If img method fails, try canvas method
                    const canvas = container.querySelector('canvas');
                    if (canvas) {
                        const dataUrl = canvas.toDataURL('image/png');
                        qrImage.src = dataUrl;
                        qrImage.style.display = 'block';
                        qrPlaceholder.style.display = 'none';
                        qrCanvas.style.display = 'none';
                        
                        currentQRData = dataUrl;
                        
                        // Clean up
                        container.remove();
                        
                        resolve();
                    } else {
                        container.remove();
                        throw new Error('Could not generate QR code');
                    }
                }
            }, 100);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Helper function to map error correction levels
function getCorrectLevel(ecc) {
    const levels = {
        'L': QRCode.CorrectLevel.L,
        'M': QRCode.CorrectLevel.M,
        'Q': QRCode.CorrectLevel.Q,
        'H': QRCode.CorrectLevel.H
    };
    return levels[ecc] || QRCode.CorrectLevel.M;
}

// Generate Audio Function
async function generateAudio(text) {
    return new Promise((resolve, reject) => {
        try {
            // Check if browser supports Speech Synthesis
            if (!('speechSynthesis' in window)) {
                console.log('Speech synthesis not supported');
                resolve();
                return;
            }
            
            const speed = parseFloat(voiceSpeed.value);
            
            // Stop any ongoing speech
            window.speechSynthesis.cancel();
            
            // Create speech synthesis
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = speed;
            utterance.volume = 1;
            
            // Set language
            utterance.lang = 'en-US';
            
            // Get available voices
            let voices = speechSynthesis.getVoices();
            
            if (voices.length === 0) {
                // Wait for voices to load
                speechSynthesis.onvoiceschanged = () => {
                    voices = speechSynthesis.getVoices();
                    setBestVoice(utterance, voices);
                    playUtterance(utterance, resolve);
                };
            } else {
                setBestVoice(utterance, voices);
                playUtterance(utterance, resolve);
            }
            
        } catch (error) {
            console.error('Error generating audio:', error);
            resolve(); // Don't reject, just continue
        }
    });
}

function setBestVoice(utterance, voices) {
    // Try to find a natural-sounding English voice
    const preferredVoices = [
        voices.find(voice => voice.name.includes('Natural')),
        voices.find(voice => voice.name.includes('Google')),
        voices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Female')),
        voices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Male')),
        voices.find(voice => voice.lang.startsWith('en'))
    ].filter(Boolean);
    
    if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
    }
}

function playUtterance(utterance, resolve) {
    utterance.onend = () => {
        resolve();
    };
    
    utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        resolve(); // Don't reject, just continue
    };
    
    speechSynthesis.speak(utterance);
}

// Preview Audio Button
previewAudioBtn.addEventListener('click', async () => {
    const text = qrInput.value.trim();
    
    if (!text) {
        alert('Please enter some text to preview audio');
        return;
    }
    
    if (text.length > 500) {
        alert('Text too long for audio preview. Please use less than 500 characters.');
        return;
    }
    
    const originalText = previewAudioBtn.innerHTML;
    previewAudioBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Playing...';
    previewAudioBtn.disabled = true;
    
    try {
        await generateAudio(text);
    } finally {
        previewAudioBtn.innerHTML = originalText;
        previewAudioBtn.disabled = false;
    }
});

// Download PNG
downloadPng.addEventListener('click', () => {
    if (!currentQRData) {
        alert('Please generate a QR code first');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `qr-code-${Date.now()}.png`;
    link.href = currentQRData;
    link.click();
});

// Download SVG
downloadSvg.addEventListener('click', async () => {
    const text = qrInput.value.trim();
    
    if (!text) {
        alert('Please generate a QR code first');
        return;
    }
    
    const size = parseInt(qrSize.value);
    const color = qrColor.value.replace('#', '');
    const bg = bgColor.value.replace('#', '');
    const ecc = errorCorrection.value;
    
    try {
        // Try backend first
        const response = await fetch('http://127.0.0.1:5000/generate-svg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                size: size,
                qr_color: color,
                bg_color: bg,
                error_correction: ecc
            })
        });
        
        if (response.ok) {
            const svgText = await response.text();
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.download = `qr-code-${Date.now()}.svg`;
            link.href = url;
            link.click();
            
            URL.revokeObjectURL(url);
        } else {
            // Fallback to client-side SVG generation
            generateSVGClientSide(text, size, color, bg, ecc);
        }
    } catch (error) {
        console.error('SVG generation error:', error);
        // Fallback to client-side
        generateSVGClientSide(text, size, color, bg, ecc);
    }
});

// Client-side SVG generation
function generateSVGClientSide(text, size, color, bg, ecc) {
    try {
        // Create a temporary container for QR code
        const container = document.createElement('div');
        container.style.display = 'none';
        document.body.appendChild(container);
        
        // Generate QR code
        const qr = new QRCode(container, {
            text: text,
            width: 100, // Smaller for SVG calculation
            height: 100,
            colorDark: '#' + color,
            colorLight: '#' + bg,
            correctLevel: getCorrectLevel(ecc)
        });
        
        setTimeout(() => {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                // Get QR code data from canvas
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, 100, 100);
                
                // Create SVG
                const cellSize = size / 100;
                let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#${bg}"/>`;
                
                // Draw QR code cells
                for (let y = 0; y < 100; y++) {
                    for (let x = 0; x < 100; x++) {
                        const index = (y * 100 + x) * 4;
                        const r = imageData.data[index];
                        const g = imageData.data[index + 1];
                        const b = imageData.data[index + 2];
                        
                        // Check if pixel is dark (QR code cell)
                        if (r < 128 && g < 128 && b < 128) {
                            svg += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#${color}"/>`;
                        }
                    }
                }
                
                svg += '</svg>';
                
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.download = `qr-code-${Date.now()}.svg`;
                link.href = url;
                link.click();
                
                URL.revokeObjectURL(url);
            }
            
            // Clean up
            container.remove();
        }, 100);
        
    } catch (error) {
        console.error('Client-side SVG generation failed:', error);
        alert('Failed to generate SVG. Please try PNG download instead.');
    }
}

// Update QR Code Information
function updateQRInfo(text) {
    const now = new Date();
    const dataType = detectDataType(text);
    const size = `${qrSize.value}x${qrSize.value}`;
    
    infoType.textContent = dataType;
    infoSize.textContent = size;
    infoDate.textContent = now.toLocaleString();
    infoLength.textContent = `${text.length} characters`;
}

function resetQRInfo() {
    infoType.textContent = '-';
    infoSize.textContent = '-';
    infoDate.textContent = '-';
    infoLength.textContent = '-';
}

function detectDataType(text) {
    if (text.startsWith('http://') || text.startsWith('https://')) {
        return 'URL';
    } else if (text.startsWith('mailto:')) {
        return 'Email';
    } else if (text.match(/^\+?[\d\s\-\(\)]+$/)) {
        return 'Phone Number';
    } else if (text.startsWith('WIFI:')) {
        return 'WiFi Network';
    } else if (text.match(/^\d+$/)) {
        return 'Numbers';
    } else {
        return 'Text';
    }
}

// Modal Functions
function showModal() {
    successModal.style.display = 'flex';
}

function hideModal() {
    successModal.style.display = 'none';
}

closeModal.addEventListener('click', hideModal);
modalOk.addEventListener('click', hideModal);

successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
        hideModal();
    }
});

// Check backend availability
async function checkBackend() {
    try {
        const response = await fetch('http://127.0.0.1:5000/health');
        isBackendAvailable = response.ok;
        console.log('Backend available:', isBackendAvailable);
    } catch (error) {
        isBackendAvailable = false;
        console.log('Backend not available, using client-side generation');
    }
}

// Initialize on load
window.addEventListener('load', () => {
    checkBackend();
    console.log('QR Code Generator loaded successfully');
    
    // Ensure QRCode library is loaded
    if (typeof QRCode === 'undefined') {
        console.warn('QRCode library not loaded, loading now...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/davidshimjs-qrcodejs@0.0.2/qrcode.min.js';
        script.onload = () => console.log('QRCode library loaded successfully');
        script.onerror = () => console.error('Failed to load QRCode library');
        document.head.appendChild(script);
    }
});