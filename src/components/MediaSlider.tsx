import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface MediaSliderProps {
  mediaUrls: string[];
  alt?: string;
  className?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export const MediaSlider = ({ 
  mediaUrls, 
  alt = "Media", 
  className = "",
  autoPlay = true,
  autoPlayInterval = 3000
}: MediaSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? mediaUrls.length - 1 : prev - 1));
  }, [mediaUrls.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === mediaUrls.length - 1 ? 0 : prev + 1));
  }, [mediaUrls.length]);

  // Autoplay functionality
  useEffect(() => {
    if (!autoPlay || isPaused || mediaUrls.length <= 1) return;
    
    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, isPaused, autoPlayInterval, goToNext, mediaUrls.length]);

  // Reset index when mediaUrls change
  useEffect(() => {
    setCurrentIndex(0);
  }, [mediaUrls]);

  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }

  const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov)$/i) !== null;
  };

  return (
    <div 
      className={cn("relative w-full", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="aspect-video relative overflow-hidden rounded-lg bg-muted">
        {isVideo(mediaUrls[currentIndex]) ? (
          <video
            src={mediaUrls[currentIndex]}
            controls
            className="w-full h-full object-cover"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={mediaUrls[currentIndex]}
            alt={`${alt} ${currentIndex + 1}`}
            className="w-full h-full object-cover transition-opacity duration-200"
          />
        )}
      </div>

      {mediaUrls.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute left-1 sm:left-2 top-1/2 -translate-y-1/2",
              "h-7 w-7 sm:h-10 sm:w-10",
              "bg-background/80 hover:bg-background transition-transform active:scale-95"
            )}
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "absolute right-1 sm:right-2 top-1/2 -translate-y-1/2",
              "h-7 w-7 sm:h-10 sm:w-10",
              "bg-background/80 hover:bg-background transition-transform active:scale-95"
            )}
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {mediaUrls.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  "rounded-full transition-all duration-200 h-2",
                  index === currentIndex
                    ? "bg-primary w-6"
                    : "bg-background/60 hover:bg-background/80 w-4"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
