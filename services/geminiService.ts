import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { VisionResponse } from "../types";

// Singleton to hold the model instance
let model: cocoSsd.ObjectDetection | null = null;
let isLoading = false;

/**
 * Loads the COCO-SSD model.
 */
export const loadModel = async (): Promise<boolean> => {
  if (model) return true;
  if (isLoading) return false;

  try {
    isLoading = true;
    console.log("Loading TensorFlow COCO-SSD model...");
    // Load the model (this downloads the weights from the CDN)
    model = await cocoSsd.load();
    console.log("Model loaded successfully.");
    isLoading = false;
    return true;
  } catch (error) {
    console.error("Failed to load TensorFlow model:", error);
    isLoading = false;
    return false;
  }
};

/**
 * Analyzes a video element using the local TensorFlow model.
 * Detects 'person' and 'cell phone' classes.
 */
export const analyzeFrame = async (input: HTMLVideoElement | HTMLCanvasElement): Promise<VisionResponse> => {
  try {
    // Ensure model is loaded
    if (!model) {
      const loaded = await loadModel();
      if (!loaded || !model) {
        // Fail gracefully if model cannot load immediately
        return { phoneDetected: false, userPresent: true, confidence: 0 };
      }
    }

    // Perform detection
    const predictions = await model.detect(input);

    let phoneDetected = false;
    let userPresent = false;
    let maxConfidence = 0;

    // Iterate through predictions to find relevant classes
    predictions.forEach(prediction => {
      // Track max confidence for debug/reporting
      if (prediction.score > maxConfidence) {
        maxConfidence = prediction.score;
      }

      // Check for Person (Class "person")
      // Threshold at 0.4: Good balance to keep user detected even if sitting still or partially framed
      if (prediction.class === 'person' && prediction.score > 0.4) {
        userPresent = true;
      }

      // Check for Phone (Class "cell phone")
      // Threshold at 0.4: Strict enough to avoid many false positives, sensitive enough to catch phones
      if (prediction.class === 'cell phone' && prediction.score > 0.4) {
        phoneDetected = true;
      }
    });

    return {
      phoneDetected,
      userPresent,
      confidence: maxConfidence
    };

  } catch (error) {
    console.error("TensorFlow Vision Error:", error);
    return { phoneDetected: false, userPresent: true, confidence: 0 };
  }
};