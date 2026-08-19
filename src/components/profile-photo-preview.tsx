import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  composeProfilePhoto,
  type ProfileComposeInput,
} from "@/lib/profile-photo";

/**
 * Pré-visualização fiel da arte 1080x1080 (renderizada em canvas reduzido).
 */
export function ProfilePhotoPreview({
  personUrl,
  bgUrl,
  frame,
  size = 420,
}: ProfileComposeInput & { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    composeProfilePhoto({ personUrl, bgUrl, frame }, size)
      .then((canvas) => {
        if (cancelled) return;
        const target = ref.current;
        if (!target) return;
        target.width = canvas.width;
        target.height = canvas.height;
        const ctx = target.getContext("2d");
        ctx?.clearRect(0, 0, target.width, target.height);
        ctx?.drawImage(canvas, 0, 0);
      })
      .catch(() => {})
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [personUrl, bgUrl, frame?.zoom, frame?.x, frame?.y, size]);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface-hover)]"
      style={{ width: size, maxWidth: "100%", aspectRatio: "1/1" }}
    >
      <canvas ref={ref} className="block h-auto w-full" />
      {busy && (
        <div className="absolute inset-0 grid place-items-center bg-black/10">
          <Loader2 className="size-5 animate-spin text-[color:var(--text-muted)]" />
        </div>
      )}
    </div>
  );
}
