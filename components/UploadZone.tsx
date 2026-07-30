"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFile: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export default function UploadZone({
  onFile,
  isLoading,
  error,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!/\.xlsx?$/i.test(file.name)) return;
      onFile(file);
    },
    [onFile],
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-indigo bg-indigo-light"
            : "border-slate-200 bg-slate-50 hover:border-indigo/50 hover:bg-indigo-light/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-light text-indigo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className="h-7 w-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 8.25 12 3.75m0 0L7.5 8.25M12 3.75v12"
            />
          </svg>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-slate-700">
              Parsing customer base…
            </p>
            <div className="h-1 w-40 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-1/2 animate-pulse-dot rounded-full bg-indigo" />
            </div>
          </div>
        ) : (
          <>
            <p className="text-base font-medium text-slate-900">
              Drop your customer base export here
            </p>
            <p className="text-sm text-slate-500">
              or click to browse — accepts .xlsx / .xls
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
