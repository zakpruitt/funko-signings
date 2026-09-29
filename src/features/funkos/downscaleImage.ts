const MAX_EDGE_PX = 360;
const QUALITY = 0.82;

function loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("The image could not be read."));
        };
        image.src = objectUrl;
    });
}

export async function downscaleImageToDataUrl(blob: Blob): Promise<string> {
    const image = await loadImage(blob);
    const {naturalWidth: width, naturalHeight: height} = image;
    if (width === 0 || height === 0) {
        throw new Error("The image could not be read.");
    }
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("The image could not be resized.");
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const webp = canvas.toDataURL("image/webp", QUALITY);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", QUALITY);
}
