import { Image } from 'image-js';
import { BoundingBox, ProcessingConfig } from './types';
import { normalizeAngle, normalizeRotation } from './geometry';
import { 
  transformCorners, 
  calculateAxisAlignedBounds,
  getBoundingBoxCenter,
  translateBoundingBoxCenter 
} from './coordinate-utils';

/**
 * Crop configuration for image extraction
 */
export interface CropConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate the crop bounds for a rotated bounding box
 * @param boundingBox - Bounding box to calculate bounds for
 * @param imageWidth - Width of the source image
 * @param imageHeight - Height of the source image
 * @returns Crop configuration
 */
export const calculateRotatedBounds = (
  boundingBox: BoundingBox,
  imageWidth: number,
  imageHeight: number
): CropConfig => {
  const corners = transformCorners(boundingBox);
  const bounds = calculateAxisAlignedBounds(corners, imageWidth, imageHeight);
  
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX + 1,
    height: bounds.maxY - bounds.minY + 1,
  };
};

/**
 * Apply an inset crop to remove edge artifacts
 * @param image - Image to crop
 * @param inset - Number of pixels to inset from each edge
 * @returns Cropped image
 */
export const applyInsetCrop = (
  image: Image,
  inset: number
): Image => {
  if (inset <= 0) {
    return image;
  }
  
  const cropX = inset;
  const cropY = inset;
  const cropWidth = Math.max(1, image.width - 2 * inset);
  const cropHeight = Math.max(1, image.height - 2 * inset);
  
  console.log(
    `📐 Applying ${inset}px inset: ${cropWidth}×${cropHeight} from ${image.width}×${image.height}`
  );
  
  return image.crop({
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });
};

/**
 * Rotate and crop an image based on a bounding box
 * @param image - Image to process
 * @param rotation - Rotation angle in degrees
 * @param boundingBox - Bounding box to extract
 * @param config - Processing configuration
 * @returns Rotated and cropped image
 */
export const rotateAndCrop = (
  image: Image,
  rotation: number,
  boundingBox: BoundingBox,
  config: ProcessingConfig = {}
): Image => {
  const { minRotation = 0.2, cropInset = 0 } = config;
  const normalizedRotation = normalizeAngle(rotation);
  
  if (Math.abs(normalizedRotation) <= minRotation) {
    console.log(
      `🔄 Skipping rotation: ${Math.abs(normalizedRotation).toFixed(1)}° <= ${minRotation}° threshold`
    );
    
    // Just crop without rotation
    const cropped = image.crop({
      x: Math.round(boundingBox.x),
      y: Math.round(boundingBox.y),
      width: Math.round(boundingBox.width),
      height: Math.round(boundingBox.height),
    });
    
    return cropInset > 0 ? applyInsetCrop(cropped, cropInset) : cropped;
  }
  
  console.log(`🔄 Rotating by ${-normalizedRotation.toFixed(1)}°`);
  
  // Rotate the image
  const rotated = image.rotate(-normalizedRotation);
  
  // Calculate where the bounding box ended up after rotation
  const expandX = (rotated.width - image.width) / 2;
  const expandY = (rotated.height - image.height) / 2;
  
  // Calculate the center of the bounding box in the original image
  const originalCenter = getBoundingBoxCenter(boundingBox);
  
  // The center should now be at this position in the rotated image
  const rotatedCenterX = originalCenter.x + expandX;
  const rotatedCenterY = originalCenter.y + expandY;
  
  // Calculate final crop coordinates
  const finalCropX = Math.max(0, Math.round(rotatedCenterX - boundingBox.width / 2));
  const finalCropY = Math.max(0, Math.round(rotatedCenterY - boundingBox.height / 2));
  const finalCropWidth = Math.min(
    Math.round(boundingBox.width),
    rotated.width - finalCropX
  );
  const finalCropHeight = Math.min(
    Math.round(boundingBox.height),
    rotated.height - finalCropY
  );
  
  console.log(
    `✂️ Final crop: ${finalCropWidth}×${finalCropHeight} at (${finalCropX}, ${finalCropY})`
  );
  
  // Crop to the final region
  let result = rotated.crop({
    x: finalCropX,
    y: finalCropY,
    width: finalCropWidth,
    height: finalCropHeight,
  });
  
  // Apply inset if specified
  if (cropInset > 0) {
    result = applyInsetCrop(result, cropInset);
  }
  
  return result;
};

/**
 * Extract a rotated rectangle region from an image
 * @param image - Source image
 * @param boundingBox - Bounding box defining the rectangle
 * @param config - Processing configuration
 * @returns Extracted image
 */
export const extractRotatedRectangle = (
  image: Image,
  boundingBox: BoundingBox,
  config: ProcessingConfig = {}
): Image => {
  // First, crop to the axis-aligned bounding box of the rotated rectangle
  const cropBounds = calculateRotatedBounds(boundingBox, image.width, image.height);
  
  console.log(
    `✂️ Initial crop: ${cropBounds.width}×${cropBounds.height} at (${cropBounds.x}, ${cropBounds.y})`
  );
  
  const cropped = image.crop(cropBounds);
  
  // Adjust the bounding box coordinates to the cropped image space
  const adjustedBoundingBox: BoundingBox = {
    x: boundingBox.x - cropBounds.x,
    y: boundingBox.y - cropBounds.y,
    width: boundingBox.width,
    height: boundingBox.height,
    rotation: boundingBox.rotation,
  };
  
  // Now rotate and crop to extract just the rectangle
  return rotateAndCrop(cropped, boundingBox.rotation, adjustedBoundingBox, config);
};

/**
 * Smart crop that handles rotation and extraction in one operation
 * @param image - Source image
 * @param boundingBox - Bounding box to extract
 * @param config - Processing configuration
 * @returns Extracted and properly oriented image
 */
export const smartCrop = (
  image: Image,
  boundingBox: BoundingBox,
  config: ProcessingConfig = {}
): Image => {
  const { minRotation = 0.2, cropInset = 8, padding = 0 } = config;
  
  // Apply padding to the bounding box if specified
  let paddedBox = boundingBox;
  if (padding > 0) {
    paddedBox = {
      x: boundingBox.x - padding,
      y: boundingBox.y - padding,
      width: boundingBox.width + 2 * padding,
      height: boundingBox.height + 2 * padding,
      rotation: boundingBox.rotation,
    };
    console.log(`📦 Applied ${padding}px padding to bounding box`);
  }
  
  // Extract the rotated rectangle
  const extracted = extractRotatedRectangle(image, paddedBox, {
    ...config,
    cropInset, // This will be applied after rotation
  });
  
  console.log(`📸 Final image: ${extracted.width}×${extracted.height}`);
  
  return extracted;
};

/**
 * Create a mask for a rotated rectangle region
 * @param width - Image width
 * @param height - Image height
 * @param boundingBox - Bounding box defining the rectangle
 * @returns Binary mask image
 */
export const createRotatedRectangleMask = (
  width: number,
  height: number,
  boundingBox: BoundingBox
): Image => {
  const mask = new Image(width, height, { 
    components: 1, 
    bitDepth: 8,
  });
  
  // Get the corners of the rotated rectangle
  const corners = transformCorners(boundingBox);
  
  // Simple point-in-polygon test for each pixel
  // Using the cross product method
  const isInsidePolygon = (px: number, py: number): boolean => {
    let inside = false;
    
    for (let i = 0, j = 3; i < 4; j = i++) {
      const xi = corners[i].x;
      const yi = corners[i].y;
      const xj = corners[j].x;
      const yj = corners[j].y;
      
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  };
  
  // Fill the mask
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isInsidePolygon(x, y)) {
        mask.setPixelXY(x, y, [255]);
      }
    }
  }
  
  return mask;
};

/**
 * Batch process configuration
 */
export interface BatchTransformConfig {
  images: Image[];
  boundingBoxes: BoundingBox[];
  config?: ProcessingConfig;
  parallel?: boolean;
}

/**
 * Batch process multiple images with their bounding boxes
 * @param batchConfig - Batch processing configuration
 * @returns Array of processed images
 */
export const batchTransform = async (
  batchConfig: BatchTransformConfig
): Promise<Image[]> => {
  const { images, boundingBoxes, config = {}, parallel = true } = batchConfig;
  
  if (images.length !== boundingBoxes.length) {
    throw new Error('Number of images must match number of bounding boxes');
  }
  
  console.log(`🔄 Batch processing ${images.length} images (${parallel ? 'parallel' : 'sequential'})`);
  
  const processOne = (index: number): Image => {
    console.log(`  📸 Processing image ${index + 1}/${images.length}`);
    return smartCrop(images[index], boundingBoxes[index], config);
  };
  
  if (parallel) {
    // Process in parallel
    return Promise.all(
      images.map((_, index) => Promise.resolve(processOne(index)))
    );
  } else {
    // Process sequentially
    const results: Image[] = [];
    for (let i = 0; i < images.length; i++) {
      results.push(processOne(i));
    }
    return results;
  }
}; 