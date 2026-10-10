"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { IMAGE_ACCEPT, MAX_ALT_LENGTH, MAX_IMAGE_BYTES, adminMediaUrl, formatBytes } from "@/lib/images";

import { uploadImage, type UploadedImage } from "./upload-image";

const buttonClass =
  "inline-flex cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-paper-raised disabled:cursor-not-allowed disabled:opacity-60";

interface CoverImageFieldProps {
  ids: string;
  path: string;
  alt: string;
  disabled: boolean;
  pathError?: string;
  altError?: string;
  onUploaded: (image: UploadedImage) => void;
  onRemove: () => void;
  onAltChange: (alt: string) => void;
  onBusyChange: (busy: boolean) => void;
}

/**
 * Upload, preview, replace, or remove the post's cover. Uploading only
 * stores the file; the post points at it once it is saved. A replaced or
 * removed cover is deleted from storage after the next successful save,
 * unless another post uses it.
 */
export function CoverImageField({
  ids,
  path,
  alt,
  disabled,
  pathError,
  altError,
  onUploaded,
  onRemove,
  onAltChange,
  onBusyChange,
}: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploading = progress !== null;

  async function upload(file: File) {
    setError(null);
    setProgress(0);
    onBusyChange(true);
    try {
      onUploaded(await uploadImage(file, "cover", setProgress));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The upload failed. Please try again.");
    } finally {
      setProgress(null);
      onBusyChange(false);
    }
  }

  const statusId = `${ids}-cover-status`;
  const shownError = error ?? pathError;

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-ink">Cover image</legend>

      <div
        className={`relative mt-2 aspect-[16/9] overflow-hidden rounded-2xl border bg-paper-sunk ${
          dragging ? "border-ink border-dashed" : "border-rule"
        }`}
        onDragOver={(event) => {
          if (disabled || uploading) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (disabled || uploading || !file) return;
          event.preventDefault();
          void upload(file);
        }}
      >
        {path ? (
          // The owner-only route serves images of unpublished posts too; it
          // bypasses the shared optimizer cache on purpose.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={adminMediaUrl(path)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-ink-muted">
            No cover. Readers see generated artwork instead.
            <br />
            Drop an image here or use the button below.
          </p>
        )}
        {uploading && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-rule" aria-hidden="true">
            <div className="h-full bg-ink transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        <button
          type="button"
          className={buttonClass}
          disabled={disabled || uploading}
          aria-describedby={statusId}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden="true" className="size-4" />
          {path ? "Replace cover" : "Upload cover"}
        </button>
        {path && (
          <button type="button" className={buttonClass} disabled={disabled || uploading} onClick={onRemove}>
            <Trash2 aria-hidden="true" className="size-4" />
            Remove cover
          </button>
        )}
        <span id={statusId} role="status" className="text-sm text-ink-muted">
          {uploading ? `Uploading… ${Math.round(progress * 100)}%` : ""}
        </span>
      </div>

      {shownError && (
        <p role="alert" className="mt-2 text-sm font-medium text-accent">
          {shownError}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-muted">
        JPEG, PNG, WebP, AVIF, or GIF, up to {formatBytes(MAX_IMAGE_BYTES)}. Shown at 16:9 on the article and cropped
        on cards.
      </p>

      {path && (
        <div className="mt-5">
          <label htmlFor={`${ids}-coverImageAlt`} className="block text-sm font-medium text-ink">
            Cover description <span className="font-normal text-ink-muted">(alt text)</span>
          </label>
          <input
            id={`${ids}-coverImageAlt`}
            name="coverImageAlt"
            maxLength={MAX_ALT_LENGTH}
            value={alt}
            readOnly={disabled}
            aria-invalid={altError ? true : undefined}
            aria-describedby={`${altError ? `${ids}-coverImageAlt-error ` : ""}${ids}-coverImageAlt-hint`}
            onChange={(event) => onAltChange(event.target.value)}
            className="mt-2 block w-full rounded-xl border border-rule-strong bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-muted aria-invalid:border-accent"
          />
          {altError && (
            <p id={`${ids}-coverImageAlt-error`} className="mt-2 text-sm font-medium text-accent">
              {altError}
            </p>
          )}
          <p id={`${ids}-coverImageAlt-hint`} className="mt-2 text-xs text-ink-muted">
            Describe what the image shows for people using screen readers. Leave empty only if it’s purely
            decorative.
          </p>
        </div>
      )}
    </fieldset>
  );
}
