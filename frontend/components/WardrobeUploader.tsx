"use client";

// ─────────────────────────────────────────────
// WardrobeUploader
// Drag-and-drop zone + file input fallback.
// Shows per-image thumbnails with remove button.
// Displays item count indicator.
// ─────────────────────────────────────────────

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";

const MAX_IMAGES = 20;
const MIN_IMAGES = 3;
const MAX_SIZE_MB = 5;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];

export interface PreviewItem {
  index: number;
  file: File;
  previewUrl: string;
}

interface Props {
  items: PreviewItem[];
  onItemsChange: (items: PreviewItem[]) => void;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME.includes(file.type)) {
    return `${file.name}: unsupported format. Use JPEG, PNG, or WEBP.`;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `${file.name}: exceeds ${MAX_SIZE_MB}MB limit.`;
  }
  return null;
}

export default function WardrobeUploader({ items, onItemsChange }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      setError(null);

      const errors: string[] = [];
      const valid: File[] = [];

      for (const file of fileArray) {
        const err = validateFile(file);
        if (err) {
          errors.push(err);
        } else {
          valid.push(file);
        }
      }

      if (errors.length > 0) {
        setError(errors[0]);
      }

      const remaining = MAX_IMAGES - items.length;
      const toAdd = valid.slice(0, remaining);

      if (toAdd.length === 0 && valid.length > 0) {
        setError(`Maximum ${MAX_IMAGES} items reached.`);
        return;
      }

      const nextIndex =
        items.length > 0 ? items[items.length - 1].index + 1 : 0;
      const newItems: PreviewItem[] = toAdd.map((file, i) => ({
        index: nextIndex + i,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      onItemsChange([...items, ...newItems]);
    },
    [items, onItemsChange],
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeItem = (indexToRemove: number) => {
    const updated = items.filter((item) => item.index !== indexToRemove);
    // Revoke URL to prevent memory leak
    const removed = items.find((item) => item.index === indexToRemove);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    onItemsChange(updated);
  };

  const isFull = items.length >= MAX_IMAGES;
  const hasMin = items.length >= MIN_IMAGES;

  return (
    <div className="w-full">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isFull && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl transition-all
          ${isFull ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${
            isDragging
              ? "border-stone-800 bg-stone-50 scale-[1.01]"
              : "border-stone-300 hover:border-stone-500 hover:bg-stone-50/50"
          }
        `}
        style={{ minHeight: "200px" }}
        role="button"
        aria-label="Upload wardrobe images"
      >
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center select-none">
          {/* Icon */}
          <div className="text-4xl mb-4 opacity-80">
            {isDragging ? "📂" : "🧺"}
          </div>

          {isFull ? (
            <p className="text-sm text-stone-500 font-medium">
              Maximum 10 items reached
            </p>
          ) : (
            <>
              <p className="text-base font-medium text-stone-700">
                Drop wardrobe photos here
              </p>
              <p className="text-sm text-stone-400 mt-1">
                or{" "}
                <span className="underline underline-offset-2">
                  browse files
                </span>
              </p>
              <p className="text-xs text-stone-600/80 mt-3">
                JPEG · PNG · WEBP · max {MAX_SIZE_MB}MB each
              </p>
            </>
          )}
        </div>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME.join(",")}
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden="true"
        />
      </div>

      {/* Item count indicator */}
      <div className="flex items-center justify-between mt-3 px-1">
        <p className="text-xs text-stone-400">
          <span
            className={`font-semibold ${hasMin ? "text-stone-700" : "text-stone-400"}`}
          >
            {items.length}
          </span>{" "}
          of {MAX_IMAGES} items added
          {!hasMin && items.length > 0 && (
            <span className="ml-2 text-amber-500">
              · {MIN_IMAGES - items.length} more needed
            </span>
          )}
        </p>
        {isFull && (
          <p className="text-xs text-stone-400">
            Remove items to add different ones
          </p>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500 mt-2 px-1">{error}</p>}

      {/* Thumbnails */}
      {items.length > 0 && (
        <div className="mt-5 grid grid-cols-3 sm:grid-cols-5 gap-3">
          {items.map((item) => (
            <div key={item.index} className="relative group aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={`Wardrobe item ${item.index + 1}`}
                className="w-full h-full object-cover rounded-xl border border-stone-200"
              />
              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.index);
                }}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-stone-900/80 text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 focus:opacity-100 focus:outline-none"
                aria-label={`Remove item ${item.index + 1}`}
              >
                ✕
              </button>
              {/* Index */}
              <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[10px] text-center py-0.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">
                #{item.index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
