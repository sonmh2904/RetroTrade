let faceapi;
let Canvas, Image, ImageData;

// Lazy load to avoid errors if packages are not installed
try {
    // Try to load face-api first
    try {
        faceapi = require('@vladmandic/face-api');
        console.log('Face-api package loaded successfully');
    } catch (faceApiError) {
        console.warn('Face-api package not found. Auto verification will fallback to manual verification.');
        console.warn('To enable auto verification, run: npm install @vladmandic/face-api');
        faceapi = null;
    }
    
    // Try to load canvas (optional, needed for face-api)
    if (faceapi) {
        try {
            const canvasModule = require('canvas');
            Canvas = canvasModule.Canvas;
            Image = canvasModule.Image;
            ImageData = canvasModule.ImageData;
            
            // Configure face-api to use canvas
            if (faceapi && faceapi.env) {
                faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
                console.log('Canvas configured for face-api');
            }
        } catch (canvasError) {
            console.warn('Canvas package not found. Face comparison may not work properly.');
            console.warn('To enable face comparison, install Visual Studio Build Tools and run: npm install canvas');
            // Still allow face-api to load, but it may not work without canvas
        }
    }
} catch (error) {
    console.error('Error loading face-api or canvas:', error);
    faceapi = null;
}

const fs = require('fs');
const path = require('path');

let modelsLoaded = false;

/**
 * Load face-api models
 */
async function loadModels() {
    if (modelsLoaded) return;
    
    if (!faceapi) {
        throw new Error('Face-api package is not installed. Auto verification will fallback to manual verification. To enable: npm install @vladmandic/face-api');
    }
    
    try {
        const modelsPath = path.join(__dirname, '../models/face-api');
        
        await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
        
        modelsLoaded = true;
        console.log('Face-api models loaded successfully');
    } catch (error) {
        console.error('Error loading face-api models:', error);
        throw new Error('Failed to load face recognition models');
    }
}

/**
 * Detect and extract face descriptor from image buffer
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Float32Array|null>} Face descriptor or null if no face detected
 */
async function extractFaceDescriptor(imageBuffer) {
    try {
        // Load models if not already loaded
        await loadModels();
        
        // Convert buffer to base64 data URL for canvas Image
        const base64 = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        
        // Create image from data URL
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = dataUrl;
        });
        
        // Detect face with landmarks
        const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (!detection) {
            return null;
        }
        
        return detection.descriptor;
    } catch (error) {
        console.error('Error extracting face descriptor:', error);
        return null;
    }
}

/**
 * Compare two face descriptors and calculate similarity percentage
 * @param {Float32Array} descriptor1 - First face descriptor
 * @param {Float32Array} descriptor2 - Second face descriptor
 * @returns {number} Similarity percentage (0-100)
 */
function calculateSimilarity(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2) {
        return 0;
    }
    
    // Calculate Euclidean distance
    let distance = 0;
    for (let i = 0; i < descriptor1.length; i++) {
        const diff = descriptor1[i] - descriptor2[i];
        distance += diff * diff;
    }
    distance = Math.sqrt(distance);
    
    // Convert distance to similarity percentage
    // face-api uses threshold of 0.6 for recognition
    // We'll use a more lenient threshold and convert to percentage
    const threshold = 0.6;
    const similarity = Math.max(0, (1 - (distance / threshold)) * 100);
    
    return Math.min(100, Math.round(similarity * 100) / 100);
}

/**
 * Compare two images and return similarity
 * @param {Buffer} image1Buffer - First image buffer (ID card face)
 * @param {Buffer} image2Buffer - Second image buffer (user photo)
 * @returns {Promise<{similarity: number, idCardFaceDetected: boolean, userFaceDetected: boolean}>}
 */
async function compareFaces(image1Buffer, image2Buffer) {
    try {
        // Check if face-api is available before attempting to load models
        if (!faceapi) {
            console.warn('Face-api package not available, returning fallback result');
            return {
                similarity: 0,
                idCardFaceDetected: false,
                userFaceDetected: false,
                error: null, // Don't show technical error to user
                fallbackToManual: true // Flag to indicate fallback
            };
        }

        await loadModels();
        
        // Extract face descriptors from both images
        const [idCardDescriptor, userDescriptor] = await Promise.all([
            extractFaceDescriptor(image1Buffer),
            extractFaceDescriptor(image2Buffer)
        ]);
        
        const idCardFaceDetected = idCardDescriptor !== null;
        const userFaceDetected = userDescriptor !== null;
        
        if (!idCardFaceDetected || !userFaceDetected) {
            return {
                similarity: 0,
                idCardFaceDetected,
                userFaceDetected,
                error: !idCardFaceDetected 
                    ? 'Không phát hiện được khuôn mặt trong ảnh CCCD' 
                    : 'Không phát hiện được khuôn mặt trong ảnh người dùng'
            };
        }
        
        // Calculate similarity
        const similarity = calculateSimilarity(idCardDescriptor, userDescriptor);
        
        return {
            similarity,
            idCardFaceDetected: true,
            userFaceDetected: true
        };
    } catch (error) {
        console.error('Error comparing faces:', error);
        
        // If error is about missing package, return fallback result
        if (error.message && error.message.includes('not installed')) {
            return {
                similarity: 0,
                idCardFaceDetected: false,
                userFaceDetected: false,
                error: null,
                fallbackToManual: true
            };
        }
        
        return {
            similarity: 0,
            idCardFaceDetected: false,
            userFaceDetected: false,
            error: 'Lỗi khi so sánh khuôn mặt. Vui lòng thử lại.'
        };
    }
}

module.exports = {
    compareFaces,
    loadModels
};

