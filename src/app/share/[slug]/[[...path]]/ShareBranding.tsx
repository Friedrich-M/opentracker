'use client';
import { PixelWordmark } from '@/components/common/PixelWordmark';

const HEIGHT = { sm: '0.875rem', md: '1rem', lg: '1.25rem' } as const;

// Shared dashboards credit the project, independently of the hosting operator.
export function ShareBranding({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <a
      href="https://github.com/Friedrich-M/opentracker"
      target="_blank"
      rel="noopener"
      style={{ marginLeft: 12 }}
    >
      <PixelWordmark text="opentracker" plain className="share-wordmark" />
      <style>{`.share-wordmark { display: block; height: ${HEIGHT[size]}; width: auto; }`}</style>
    </a>
  );
}
