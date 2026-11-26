"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
  type SyntheticEvent,
} from "react";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MIN_CROP_SIZE = 0.12;

type Preview = { file: File; url: string };
type ImageDimensions = { width: number; height: number };
type CropRect = { x: number; y: number; width: number; height: number };
type CropDrag = {
  mode: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  crop: CropRect;
};

export function ImageUploadPreview({
  accept = "image/jpeg,image/png,image/webp,image/avif",
  aspectRatio = 1,
  name = "file",
  required = true,
}: Readonly<{
  accept?: string;
  aspectRatio?: number;
  name?: string;
  required?: boolean;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<CropDrag | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0.08, y: 0.08, width: 0.84, height: 0.84 });
  const [isCropped, setIsCropped] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropError, setCropError] = useState("");

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function releaseUrls() {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    sourceUrlRef.current = null;
    previewUrlRef.current = null;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    const invalidReason = getInvalidReason(file);
    event.currentTarget.setCustomValidity(invalidReason);
    releaseUrls();
    setDimensions(null);
    setSourceFile(file);
    setSourceUrl(null);
    setPreview(null);
    setCrop({ x: 0.08, y: 0.08, width: 0.84, height: 0.84 });
    setIsCropped(false);
    setCropError("");

    if (file && !invalidReason) {
      const url = URL.createObjectURL(file);
      sourceUrlRef.current = url;
      setSourceUrl(url);
      setPreview({ file, url });
      previewUrlRef.current = url;
    }
  }

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
    if (!width || !height) return;
    setDimensions({ width, height });
    setCrop(createInitialCrop(width, height, aspectRatio));
  }

  function beginDrag(event: PointerEvent<HTMLElement>, mode: CropDrag["mode"]) {
    if (!dimensions || !stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    stageRef.current.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      crop,
    };
  }

  function moveCrop(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stage || !dimensions) return;
    const bounds = stage.getBoundingClientRect();
    const dx = (event.clientX - drag.startX) / bounds.width;
    const dy = (event.clientY - drag.startY) / bounds.height;

    if (drag.mode === "move") {
      setCrop({
        ...drag.crop,
        x: clamp(drag.crop.x + dx, 0, 1 - drag.crop.width),
        y: clamp(drag.crop.y + dy, 0, 1 - drag.crop.height),
      });
      return;
    }

    const heightPerWidth = dimensions.width / (dimensions.height * aspectRatio);
    const minimumWidth = Math.max(MIN_CROP_SIZE, MIN_CROP_SIZE / heightPerWidth);
    const maximumWidth = Math.min(1 - drag.crop.x, (1 - drag.crop.y) / heightPerWidth);
    const nextWidth = clamp(
      drag.crop.width + (dx + dy / heightPerWidth) / 2,
      minimumWidth,
      maximumWidth,
    );
    const nextHeight = nextWidth * heightPerWidth;
    setCrop({ ...drag.crop, width: nextWidth, height: nextHeight });
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function nudgeCrop(event: KeyboardEvent<HTMLDivElement>) {
    if (!dimensions) return;
    const amount = event.shiftKey ? 0.01 : 0.015;
    const positions: Record<string, CropRect> = {
      ArrowLeft: { ...crop, x: clamp(crop.x - amount, 0, 1 - crop.width) },
      ArrowRight: { ...crop, x: clamp(crop.x + amount, 0, 1 - crop.width) },
      ArrowUp: { ...crop, y: clamp(crop.y - amount, 0, 1 - crop.height) },
      ArrowDown: { ...crop, y: clamp(crop.y + amount, 0, 1 - crop.height) },
    };
    if (!event.shiftKey && positions[event.key]) {
      event.preventDefault();
      setCrop(positions[event.key]);
      return;
    }
    if (event.shiftKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const heightPerWidth = dimensions.width / (dimensions.height * aspectRatio);
      const minWidth = Math.max(MIN_CROP_SIZE, MIN_CROP_SIZE / heightPerWidth);
      const maxWidth = Math.min(1 - crop.x, (1 - crop.y) / heightPerWidth);
      const delta = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -amount : amount;
      const nextWidth = clamp(crop.width + delta, minWidth, maxWidth);
      setCrop({ ...crop, width: nextWidth, height: nextWidth * heightPerWidth });
    }
  }

  async function applyCrop() {
    if (!sourceFile || !dimensions || getInvalidReason(sourceFile)) return;

    setIsCropping(true);
    try {
      const bitmap = await createImageBitmap(sourceFile);
      const sourceX = Math.round(crop.x * bitmap.width);
      const sourceY = Math.round(crop.y * bitmap.height);
      const sourceWidth = Math.round(crop.width * bitmap.width);
      const sourceHeight = Math.round(crop.height * bitmap.height);
      const canvasWidth = 1_200;
      const canvasHeight = Math.round(canvasWidth / aspectRatio);
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.drawImage(
        bitmap,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvasWidth,
        canvasHeight,
      );
      bitmap.close();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Crop export failed");

      const filename = sourceFile.name.replace(/\.[^.]+$/, "") || "image";
      const croppedFile = new File([blob], `${filename}-cropped.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      const transfer = new DataTransfer();
      transfer.items.add(croppedFile);
      if (inputRef.current) {
        inputRef.current.files = transfer.files;
        inputRef.current.setCustomValidity(getInvalidReason(croppedFile));
      }
      if (previewUrlRef.current && previewUrlRef.current !== sourceUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const croppedUrl = URL.createObjectURL(croppedFile);
      previewUrlRef.current = croppedUrl;
      setPreview({ file: croppedFile, url: croppedUrl });
      setIsCropped(true);
      setCropError("");
    } catch {
      setCropError("This image could not be cropped in this browser. You can upload the original.");
    } finally {
      setIsCropping(false);
    }
  }

  function restoreOriginal() {
    if (!sourceFile || !sourceUrl) return;
    const transfer = new DataTransfer();
    transfer.items.add(sourceFile);
    if (inputRef.current) {
      inputRef.current.files = transfer.files;
      inputRef.current.setCustomValidity(getInvalidReason(sourceFile));
    }
    if (previewUrlRef.current && previewUrlRef.current !== sourceUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = sourceUrl;
    setPreview({ file: sourceFile, url: sourceUrl });
    setIsCropped(false);
    setCropError("");
  }

  const previewError = getInvalidReason(preview?.file ?? sourceFile);
  const ratio = dimensions ? dimensions.width / dimensions.height : 1;
  const maxStageWidth = Math.min(672, 416 * ratio);

  return (
    <div className="admin-image-upload">
      <label className="admin-field">
        <span>Choose image</span>
        <input
          accept={accept}
          name={name}
          onChange={handleChange}
          ref={inputRef}
          required={required}
          type="file"
        />
        <small>JPEG, PNG, WebP or AVIF · up to 5 MiB</small>
      </label>
      {previewError ? (
        <p className="admin-alert admin-alert--error" role="alert">
          {previewError}
        </p>
      ) : null}
      {sourceUrl ? (
        <div className="admin-image-upload__editor">
          <div className="admin-image-upload__crop-workspace">
            <p className="admin-image-upload__instructions">
              Drag the crop area to frame the image. Use its corner to resize.
            </p>
            <div
              aria-label="Image crop area"
              className="admin-image-upload__stage"
              onPointerCancel={finishDrag}
              onPointerMove={moveCrop}
              onPointerUp={finishDrag}
              ref={stageRef}
              style={{
                aspectRatio: dimensions ? `${dimensions.width} / ${dimensions.height}` : "1 / 1",
                maxWidth: `min(100%, ${maxStageWidth}px)`,
              }}
            >
              <Image
                alt={`Crop source: ${sourceFile?.name ?? "selected image"}`}
                className="admin-image-upload__source"
                draggable={false}
                fill
                onLoad={handleImageLoad}
                sizes="(max-width: 48rem) 100vw, 42rem"
                src={sourceUrl}
                unoptimized
              />
              {dimensions ? (
                <div
                  aria-label="Move crop selection. Use arrow keys to adjust and Shift plus an arrow to resize."
                  className="admin-image-upload__selection"
                  onKeyDown={nudgeCrop}
                  onPointerDown={(event) => beginDrag(event, "move")}
                  role="group"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.width * 100}%`,
                    height: `${crop.height * 100}%`,
                  }}
                  tabIndex={0}
                >
                  <span aria-hidden="true" className="admin-image-upload__grid" />
                  <button
                    aria-label="Resize crop selection"
                    className="admin-image-upload__resize-handle"
                    onPointerDown={(event) => beginDrag(event, "resize")}
                    type="button"
                  />
                </div>
              ) : (
                <span className="admin-image-upload__stage-loading">Preparing crop area…</span>
              )}
            </div>
          </div>
          <figure className="admin-image-upload__preview">
            <div className="admin-image-upload__frame" style={{ aspectRatio }}>
              {preview ? (
                <Image alt={`Preview of ${preview.file.name}`} fill src={preview.url} unoptimized />
              ) : null}
            </div>
            <figcaption>
              <strong>{preview?.file.name}</strong>
              <span>
                {preview
                  ? `${(preview.file.size / (1024 * 1024)).toFixed(2)} MiB · local preview`
                  : "Preview after selecting an image"}
                {isCropped ? " · crop applied" : ""}
              </span>
            </figcaption>
            <div className="admin-image-upload__crop-actions">
              <button
                className="admin-button admin-button--primary"
                disabled={!dimensions || Boolean(previewError) || isCropping}
                onClick={() => void applyCrop()}
                type="button"
              >
                {isCropping ? <span aria-hidden="true" className="admin-button__spinner" /> : null}
                {isCropping ? "Preparing preview…" : "Apply crop"}
              </button>
              {isCropped ? (
                <button
                  className="admin-button admin-button--quiet"
                  onClick={restoreOriginal}
                  type="button"
                >
                  Restore original
                </button>
              ) : null}
            </div>
            {cropError ? (
              <p aria-live="polite" className="admin-alert admin-alert--error" role="alert">
                {cropError}
              </p>
            ) : null}
          </figure>
        </div>
      ) : (
        <p aria-live="polite" className="admin-image-upload__placeholder">
          Choose a file to preview and crop it before upload.
        </p>
      )}
    </div>
  );
}

function getInvalidReason(file: File | null): string {
  if (!file) return "";
  if (!ACCEPTED_TYPES.includes(file.type)) return "Choose a JPEG, PNG, WebP or AVIF image.";
  if (file.size === 0) return "Choose an image that is not empty.";
  if (file.size > MAX_FILE_SIZE_BYTES) return "Choose an image smaller than 5 MiB.";
  return "";
}

function createInitialCrop(width: number, height: number, aspectRatio: number): CropRect {
  const heightPerWidth = width / (height * aspectRatio);
  const widthFraction = heightPerWidth > 1 ? 0.84 / heightPerWidth : 0.84;
  const heightFraction = widthFraction * heightPerWidth;
  return {
    x: (1 - widthFraction) / 2,
    y: (1 - heightFraction) / 2,
    width: widthFraction,
    height: heightFraction,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
