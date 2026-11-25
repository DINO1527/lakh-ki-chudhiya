"use client";

import Image from "next/image";
import { useState } from "react";
import type { PublicImage } from "../domain/catalogue";

export function ProductGallery({
  images,
  label,
  className = "",
}: Readonly<{ images: readonly PublicImage[]; label: string; className?: string }>) {
  const [selectedId, setSelectedId] = useState(images[0]?.id ?? "");
  const selectedImage = images.find((image) => image.id === selectedId) ?? images[0];

  return (
    <section aria-label={`${label} photos`} className={`product-gallery ${className}`.trim()}>
      <div className="product-gallery__main">
        {selectedImage ? (
          <Image
            alt={selectedImage.altText}
            className="product-gallery__image"
            height={1000}
            priority
            src={selectedImage.url}
            unoptimized
            width={1000}
          />
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
    </section>
  );
}
