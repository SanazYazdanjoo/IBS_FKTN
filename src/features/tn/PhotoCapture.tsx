/**
 * Real photo capture as a first-class upload path (P1): a phone camera is
 * the realistic route for the TN with the least digital literacy, not a
 * fallback behind a desktop-style file picker. `capture="environment"`
 * hints the back camera on mobile; the browser's own file chooser still
 * offers "choose existing photo" alongside it, so nothing is lost for a
 * desktop user either.
 */
import { useRef, type ChangeEvent } from 'react';
import { PrimaryButton } from '../../app/ui';
import { useT } from '../../i18n/LocaleContext';

export default function PhotoCapture({
  onCapture,
  uploaded = false,
  logId,
  large = false,
}: {
  onCapture: (fileName: string) => void;
  /** Whether this proof already has a file on record — swaps the button label to "retake". */
  uploaded?: boolean;
  logId?: string;
  /** Bigger touch target for Schritt-für-Schritt (P1). */
  large?: boolean;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onCapture(file.name);
    e.target.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        aria-label={t.photoCapture.takePhoto}
      />
      <PrimaryButton
        onClick={() => inputRef.current?.click()}
        logId={logId}
        className={large ? 'w-full py-4 text-lg' : ''}
      >
        {uploaded ? t.photoCapture.retake : t.photoCapture.takePhoto}
      </PrimaryButton>
    </div>
  );
}
