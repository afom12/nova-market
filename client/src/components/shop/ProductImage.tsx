import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}

/**
 * Images may be local assets or remote CDN URLs, and a remote URL can rot.
 * Rather than showing a broken-image icon, a failed load falls back to a
 * neutral placeholder so the layout never breaks.
 */
export const ProductImage = ({ src, alt, className, sizes }: ProductImageProps) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={cn('flex items-center justify-center bg-secondary text-muted-foreground', className)}
        role="img"
        aria-label={`${alt} (image unavailable)`}
      >
        <ImageOff className="h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
};
