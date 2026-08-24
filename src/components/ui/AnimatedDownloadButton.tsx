import React, { useState } from "react";
import { Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedDownloadButtonProps {
  onDownload: () => void;
  filename?: string;
  className?: string;
  label?: string;
}

export const AnimatedDownloadButton: React.FC<AnimatedDownloadButtonProps> = ({
  onDownload,
  filename,
  className,
  label = "Baixar",
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const id = React.useId();

  const handleAction = () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    onDownload();
    
    // Reset after animation sequence (approx 5.5s based on CSS)
    setTimeout(() => {
      setIsDownloading(false);
    }, 6000);
  };

  return (
    <div className={cn("download-button-wrapper", className)}>
      <input
        type="checkbox"
        id={id}
        className="download-button-input"
        checked={isDownloading}
        readOnly
      />
      <label 
        htmlFor={id} 
        className="download-button-label"
        onClick={(e) => {
          e.stopPropagation(); // Previne que o click suba para elementos pai
          e.preventDefault();
          handleAction();
        }}
      >
        <div className={cn("download-button-inner", label === "" && "w-7")}>
          <i className={cn("l", label === "" && "left-0 opacity-100")}><Download size={label === "" ? 16 : 20} /></i>
          {label !== "" && <span className="t">{label}</span>}
          
          {/* Decorative spots */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="download-button-spots" />
          ))}
        </div>
        <div className="download-button-tick">
          <Check size={label === "" ? 18 : 24} strokeWidth={3} />
        </div>
      </label>
    </div>
  );
};
