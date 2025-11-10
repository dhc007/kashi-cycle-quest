import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface MediaSliderProps {
  mediaUrls: string[];
  alt?: string;
  className?: string;
}

export const MediaSlider = ({ mediaUrls, alt = "Media", className = "" }: MediaSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? mediaUrls.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === mediaUrls.length - 1 ? 0 : prev + 1));
  };

  const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov)$/i) !== null;
  };

  return (
    <div className={`relative w-full ${className}`}>
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
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {mediaUrls.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            {mediaUrls.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-primary w-4"
                    : "bg-background/60 hover:bg-background/80"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
