// src/lib/cropImage.ts

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // Avoid CORS issues
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * This function was adapted from the one in the react-easy-crop tutorial
 * with added functionality to output a Blob/File directly.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = {
    width: image.width,
    height: image.height,
  };

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // set canvas core to other rotation point
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-bBoxWidth / 2, -bBoxHeight / 2);

  // draw rotated image to canvas centered
  ctx.drawImage(
    image,
    bBoxWidth / 2 - image.width / 2,
    bBoxHeight / 2 - image.height / 2
  );

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this resizes the image
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image with correct offsets for x,y crop
  ctx.putImageData(data, 0, 0);

  // As a File
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        // We output a JPEG for maximum compression and fixed resolution
        resolve(new File([file], 'avatar.jpg', { type: 'image/jpeg' }));
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg', 0.85); // 0.85 compression quality
  });
}