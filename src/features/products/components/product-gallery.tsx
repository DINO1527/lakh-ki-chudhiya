"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { PublicImage } from "../domain/catalogue";

export function ProductGallery({
  images,
  label,
  className = "",
  priority = false,
}: Readonly<{
  images: readonly PublicImage[];
  label: string;
  className?: string;
  priority?: boolean;
}>) {
  const [selectedId, setSelectedId] = useState(images[0]?.id ?? "");
  const selectedImage = images.find((image) => image.id === selectedId) ?? images[0];
  const selectedIndex = images.findIndex((image) => image.id === selectedImage?.id);
  const viewerRef = useRef<HTMLDialogElement>(null);
  const viewerTitleId = useId();
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (isZoomOpen && !viewer.open) viewer.showModal();
    if (!isZoomOpen && viewer.open) viewer.close();
  }, [isZoomOpen]);

  function movePhoto(direction: -1 | 1) {
    if (images.length < 2) return;
    const nextIndex = (selectedIndex + direction + images.length) % images.length;
    setSelectedId(images[nextIndex].id);
  }

  return (
    <section aria-label={`${label} photos`} className={`product-gallery ${className}`.trim()}>
      <div className="product-gallery__main">
        {selectedImage ? (
          <button
            aria-haspopup="dialog"
            aria-label={"Enlarge product photo: " + selectedImage.altText}
            className="product-gallery__open"
            onClick={() => setIsZoomOpen(true)}
            type="button"
          >
            <Image
              alt={selectedImage.altText}
              className="product-gallery__image"
              height={1000}
              key={selectedImage.id}
              loading={priority ? "eager" : "lazy"}
              sizes="(max-width: 52rem) 100vw, 50vw"
              src={selectedImage.url}
              unoptimized
              width={1000}
            />
            <span className="product-gallery__zoom-hint">View larger</span>
          </button>
        ) : (
          <p className="product-gallery__empty">Verified product photography will appear here.</p>
        )}
      </div>
      {images.length > 1 ? (
        <div aria-label="Choose photo angle" className="product-gallery__thumbnails">
          {images.map((image, index) => (
            <button
              aria-label={`Photo ${index + 1}: ${image.altText}`}
              aria-pressed={image.id === selectedImage?.id}
              className="product-gallery__thumbnail"
              key={image.id}
              onClick={() => setSelectedId(image.id)}
              type="button"
            >
              <Image alt="" height={120} src={image.url} unoptimized width={120} />
            </button>
          ))}
        </div>
      ) : null}
      {selectedImage ? (
        <dialog
          aria-labelledby={viewerTitleId}
          className="product-image-viewer"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsZoomOpen(false);
          }}
          onClose={() => setIsZoomOpen(false)}
          ref={viewerRef}
        >
          <h2 className="visually-hidden" id={viewerTitleId}>
            {label} photo preview
          </h2>
          <div className="product-image-viewer__content">
            <button
              aria-label="Close enlarged photo"
              className="product-image-viewer__close"
              onClick={() => setIsZoomOpen(false)}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
            <div className="product-image-viewer__stage">
              {images.length > 1 ? (
                <button
                  aria-label="Previous product photo"
                  className="product-image-viewer__step product-image-viewer__step--previous"
                  onClick={() => movePhoto(-1)}
                  type="button"
                >
                  <span aria-hidden="true">‹</span>
                </button>
              ) : null}
              <div className="product-image-viewer__image">
                <Image
                  alt={selectedImage.altText}
                  fill
                  key={selectedImage.id}
                  sizes="100vw"
                  src={selectedImage.url}
                  unoptimized
                />
              </div>
              {images.length > 1 ? (
                <button
                  aria-label="Next product photo"
                  className="product-image-viewer__step product-image-viewer__step--next"
                  onClick={() => movePhoto(1)}
                  type="button"
                >
                  <span aria-hidden="true">›</span>
                </button>
              ) : null}
            </div>
            <p>{selectedImage.altText}</p>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
