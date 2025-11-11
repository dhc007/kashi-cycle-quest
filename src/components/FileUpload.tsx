import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File | null) => void;
  maxSize?: number; // in MB
  description?: string;
  captureMode?: 'camera' | 'upload' | 'both'; // NEW: Control capture behavior
}

export const FileUpload = ({ 
  label, 
  accept, 
  onFileSelect, 
  maxSize = 10,
  description,
  captureMode = 'both' // Default to both upload and camera
}: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      console.log('FileUpload: No file selected');
      return;
    }

    console.log('FileUpload: File selected', {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type
    });

    // Check file size
    if (selectedFile.size > maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxSize}MB`,
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    onFileSelect(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        console.log('FileUpload: Preview created for', selectedFile.name);
      };
      reader.readAsDataURL(selectedFile);
    }

    toast({
      title: "File uploaded",
      description: `${selectedFile.name} uploaded successfully`,
    });
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    onFileSelect(null);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {!file ? (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`file-${label.replace(/\s/g, "-")}`}
            capture={captureMode === 'camera' ? 'user' : captureMode === 'both' ? 'environment' : undefined}
          />
          <label
            htmlFor={`file-${label.replace(/\s/g, "-")}`}
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {captureMode === 'camera' ? 'Tap to capture photo' : 'Tap to upload or capture'}
            </span>
            <span className="text-xs text-muted-foreground">
              Max file size: {maxSize}MB
            </span>
          </label>
        </div>
      ) : (
        <div className="border border-border rounded-lg p-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {preview ? (
                <img src={preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
              ) : (
                <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRemove}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
