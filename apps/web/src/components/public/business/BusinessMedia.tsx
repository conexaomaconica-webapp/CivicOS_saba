import Image from 'next/image';
import type { PublicMediaAsset } from '@/lib/business/public-business-presentation';

type BusinessMediaProps = {
  asset: PublicMediaAsset;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function BusinessMedia({ asset, className, priority = false, sizes = '100vw' }: BusinessMediaProps) {
  if (asset.crop) {
    const { sourceWidth, sourceHeight, x, y, width, height } = asset.crop;
    return (
      <span className={`cm-crop-media ${className ?? ''}`} role="img" aria-label={asset.alt}>
        <Image
          src={asset.url}
          alt=""
          width={sourceWidth}
          height={sourceHeight}
          priority={priority}
          unoptimized
          sizes={sizes}
          style={{
            width: `${(sourceWidth / width) * 100}%`,
            height: `${(sourceHeight / height) * 100}%`,
            left: `${-(x / width) * 100}%`,
            top: `${-(y / height) * 100}%`,
          }}
        />
      </span>
    );
  }

  return (
    <span className={`cm-business-media ${className ?? ''}`}>
      <Image
        src={asset.url}
        alt={asset.alt}
        fill
        priority={priority}
        unoptimized
        sizes={sizes}
      />
    </span>
  );
}
