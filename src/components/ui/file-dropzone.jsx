import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, File } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropzone({
  onFileSelect,
  accept = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
      ".xls",
    ],
  },
  maxSize = 5 * 1024 * 1024, // 5MB
  className,
  ...props
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isExcel) {
      setError("Solo se permiten archivos Excel (.xlsx, .xls)");
      return;
    }

    if (file.size > maxSize) {
      setError(
        `El archivo es demasiado grande (Máx ${maxSize / 1024 / 1024}MB)`,
      );
      return;
    }

    setSelectedFile(file);
    setError(null);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  return (
    <div
      className={cn(
        "w-full transition-all duration-200 ease-in-out",
        className,
      )}
    >
      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[200px] p-8 text-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 group",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          selectedFile &&
            "border-green-500/50 bg-green-50/30 dark:bg-green-900/10",
          error && "border-destructive/50 bg-destructive/5",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".xlsx, .xls"
          onChange={handleFileInput}
          {...props}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="bg-green-100 p-4 rounded-full mb-4 dark:bg-green-900/30 ring-4 ring-green-50 dark:ring-green-900/10">
              <FileSpreadsheet className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-lg font-medium mb-1 max-w-[300px] truncate text-foreground">
              {selectedFile.name}
            </div>
            <div className="text-sm text-muted-foreground mb-6">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </div>
            <button
              onClick={removeFile}
              className="z-10 group relative flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-destructive/20"
              type="button"
            >
              <X className="w-4 h-4" />
              <span>Eliminar archivo</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 pointer-events-none">
            <div
              className={cn(
                "p-5 rounded-full mb-2 transition-all duration-500 ring-4 ring-muted/30",
                isDragActive
                  ? "bg-primary/10 text-primary ring-primary/20 scale-110"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary",
              )}
            >
              <Upload className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                {isDragActive ? "Suelta el archivo aquí" : "Sube tu archivo"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {isDragActive
                  ? "..."
                  : "Arrastra y suelta tu archivo Excel aquí, o haz clic para buscar"}
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm font-medium text-destructive mt-4 animate-in fade-in slide-in-from-top-1 bg-destructive/10 px-4 py-2 rounded-lg">
                <X className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
