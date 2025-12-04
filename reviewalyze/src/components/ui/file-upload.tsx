"use client";

import { cn } from "@/lib/utils";
import { ChangeEvent, useRef } from "react";

interface FileUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileChange: (file: File) => void;
  accept?: string;
}

export function FileUpload({
  className,
  onFileChange,
  accept = "image/*",
  children,
  ...props
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-card/70 p-5 text-center transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      {...props}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept={accept}
        className="hidden"
      />
      {children}
    </div>
  );
}
