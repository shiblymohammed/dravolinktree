"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import type { CarouselImage } from "@/lib/types";

export function Carousel({ images }: { images: CarouselImage[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    if (images.length === 0) return;
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    if (images.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % images.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-advance interval
  useEffect(() => {
    if (images.length === 0) return;

    const interval = setInterval(() => {
      if (images.length === 0) return; // Guard against mid-interval deletion
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length, images]);

  // Keyboard navigation
  useEffect(() => {
    if (images.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (images.length > 0) {
          setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
        }
      }
      if (e.key === "ArrowRight") {
        if (images.length > 0) {
          setCurrentIndex(prev => (prev + 1) % images.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length]);

  if (images.length === 0) {
    // Fallback to static hero
    return (
      <div className="hero-photo">
        <Image
          src="/images/hero.png"
          alt="A sunlit living room with an ivory sofa, walnut accents and timeless natural textures"
          fill
          priority
          sizes="(max-width: 800px) 100vw, 53vw"
          className="hero-image"
        />
        <div className="photo-shade" />
        <span className="photo-label">
          <span className="little-dot" /> THE DRAVOHOME WAY
        </span>
        <div className="photo-copy">
          <span className="photo-eyebrow">THOUGHTFUL FURNITURE. BEAUTIFUL SPACES.</span>
          <h2>
            For the moments
            <br />
            that make a <em>home.</em>
          </h2>
          <div className="photo-bottom">
            <span>Considered design. Effortless living.</span>
            <span className="circle-arrow">
              <ArrowUpRight size={23} strokeWidth={1.3} />
            </span>
          </div>
        </div>
        <span className="photo-index">01 / THE ART OF LIVING</span>
      </div>
    );
  }

  return (
    <div className="hero-photo">
      {images.map((image, index) => (
        <div
          key={image.id}
          className="carousel-slide"
          style={{
            opacity: index === currentIndex ? 1 : 0,
            pointerEvents: index === currentIndex ? "auto" : "none",
          }}
        >
          <Image
            src={`/images/carousel/${image.filename}`}
            alt={image.alt}
            fill
            priority={index === 0}
            sizes="(max-width: 800px) 100vw, 53vw"
            className="hero-image"
          />
        </div>
      ))}
      <div className="photo-shade" />
      <span className="photo-label">
        <span className="little-dot" /> THE DRAVOHOME WAY
      </span>
      <div className="photo-copy">
        <span className="photo-eyebrow">THOUGHTFUL FURNITURE. BEAUTIFUL SPACES.</span>
        <h2>
          For the moments
          <br />
          that make a <em>home.</em>
        </h2>
        <div className="photo-bottom">
          <span>Considered design. Effortless living.</span>
          <span className="circle-arrow">
            <ArrowUpRight size={23} strokeWidth={1.3} />
          </span>
        </div>
      </div>
      <span className="photo-index">
        {String(currentIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
      </span>

      {images.length > 1 && (
        <>
          <div className="carousel-controls">
            <button
              className="carousel-btn"
              onClick={goToPrevious}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="carousel-btn"
              onClick={goToNext}
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="carousel-dots">
            {images.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentIndex ? "active" : ""}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
