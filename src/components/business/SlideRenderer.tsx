import { memo } from 'react';
import { cn } from '@/lib/cn';
import { getSlideImageUrl } from '@/services/business-slide.service';
import type { BusinessSlide, SlideAnimationType } from '@/types';

interface SlideRendererProps {
  slide: BusinessSlide;
  isActive: boolean;
  isMobile: boolean;
  eager?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

function getAnimationClasses(
  animationType: SlideAnimationType,
  isActive: boolean,
  reducedMotion: boolean,
): string {
  if (reducedMotion || animationType === 'none') {
    return isActive ? 'opacity-100' : 'opacity-0';
  }

  const activePrefix = isActive ? 'opacity-100' : 'opacity-0';
  const transformActive = isActive ? 'translate-x-0 scale-100' : '';

  switch (animationType) {
    case 'fade':
      return cn(activePrefix, 'transition-opacity duration-700');
    case 'slide':
      return cn(
        activePrefix,
        isActive ? 'translate-x-0' : 'translate-x-8',
        'transition-all duration-700 ease-out',
      );
    case 'zoom':
      return cn(
        activePrefix,
        isActive ? 'scale-100' : 'scale-95',
        'transition-all duration-700 ease-out',
      );
    case 'fade-slide':
    default:
      return cn(
        activePrefix,
        transformActive || 'translate-x-6',
        'transition-all duration-700 ease-out',
      );
  }
}

function getLayerAnimationClasses(
  animationType: SlideAnimationType,
  isActive: boolean,
  reducedMotion: boolean,
): string {
  if (reducedMotion || animationType === 'none') {
    return isActive ? 'opacity-100' : 'opacity-0';
  }

  if (isActive) {
    return 'opacity-100 translate-x-0 translate-y-0 scale-100';
  }

  switch (animationType) {
    case 'fade':
      return 'opacity-0 translate-y-0';
    case 'slide':
      return 'opacity-0 translate-x-6';
    case 'zoom':
      return 'opacity-0 scale-90';
    case 'fade-slide':
    default:
      return 'opacity-0 translate-y-4';
  }
}

function resolveSlideLink(slide: BusinessSlide): string | null {
  switch (slide.linkType) {
    case 'business':
      return slide.linkBusinessId ? `/businesses?business=${slide.linkBusinessId}` : null;
    case 'category':
      return slide.linkCategoryId ? `/businesses?category=${slide.linkCategoryId}` : null;
    case 'custom':
      return slide.linkCustomUrl || null;
    default:
      return null;
  }
}

function SlideRendererImpl({
  slide,
  isActive,
  isMobile,
  eager = false,
  reducedMotion = false,
  className,
}: SlideRendererProps) {
  const bgUrl = getSlideImageUrl(slide.backgroundImagePath);
  const mainUrl = getSlideImageUrl(slide.mainImagePath);
  const mobileUrl = getSlideImageUrl(slide.mobileImagePath);
  const hasMobileImage = isMobile && mobileUrl;

  const textColorClass = slide.textColor === 'light' ? 'text-white' : 'text-neutral-800';
  const dropShadow = slide.textColor === 'light' ? 'drop-shadow-md' : '';

  const link = resolveSlideLink(slide);
  const Wrapper = link ? 'a' : 'div';
  const linkProps = link ? { href: link } : {};

  const contentPositionClass =
    slide.contentPosition === 'center'
      ? 'items-center text-center'
      : slide.contentPosition === 'left'
        ? 'items-start text-left'
        : 'items-end text-right';

  const sortedLayers = [...slide.layers].sort(
    (a, b) => a.zIndex - b.zIndex || a.sortOrder - b.sortOrder,
  );

  return (
    <Wrapper
      {...linkProps}
      className={cn('relative block w-full h-full overflow-hidden', link && 'cursor-pointer', className)}
    >
      {/* Background image or mobile image */}
      {hasMobileImage ? (
        <img
          src={mobileUrl ?? undefined}
          alt={slide.title ?? slide.internalName}
          className="absolute inset-0 w-full h-full object-cover"
          loading={eager ? 'eager' : 'lazy'}
          decoding={eager ? 'sync' : 'async'}
        />
      ) : bgUrl ? (
        <img
          src={bgUrl}
          alt={slide.title ?? slide.internalName}
          className="absolute inset-0 w-full h-full object-cover"
          loading={eager ? 'eager' : 'lazy'}
          decoding={eager ? 'sync' : 'async'}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800" />
      )}

      {/* Dark overlay */}
      {slide.overlayOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: slide.overlayOpacity / 100 }}
        />
      )}

      {/* Additional layers (sorted by z_index) */}
      {!hasMobileImage &&
        sortedLayers.map((layer) => {
          if (!layer.isVisible) return null;
          const layerImgUrl = getSlideImageUrl(layer.imagePath);
          const animClass = getLayerAnimationClasses(layer.animationType, isActive, reducedMotion);
          const transitionDelay = `${layer.animationDelayMs}ms`;

          if (layer.layerType === 'image' && layerImgUrl) {
            return (
              <div
                key={layer.id}
                className={cn('absolute transition-all duration-700 ease-out', animClass)}
                style={{
                  left: `${layer.positionX}%`,
                  top: `${layer.positionY}%`,
                  width: layer.width ? `${layer.width}%` : 'auto',
                  transform: 'translate(-50%, -50%)',
                  zIndex: layer.zIndex,
                  transitionDelay,
                }}
              >
                <img
                  src={layerImgUrl}
                  alt=""
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </div>
            );
          }

          if (layer.layerType === 'text' && layer.content) {
            return (
              <div
                key={layer.id}
                className={cn(
                  'absolute transition-all duration-700 ease-out text-sm font-medium',
                  textColorClass,
                  animClass,
                )}
                style={{
                  left: `${layer.positionX}%`,
                  top: `${layer.positionY}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: layer.zIndex,
                  transitionDelay,
                }}
              >
                <span className={dropShadow}>{layer.content}</span>
              </div>
            );
          }

          if (layer.layerType === 'button' && layer.content) {
            const btnLink = layer.linkUrl || '#';
            return (
              <a
                key={layer.id}
                href={btnLink}
                onClick={(e) => {
                  if (!layer.linkUrl) e.preventDefault();
                }}
                className={cn(
                  'absolute transition-all duration-700 ease-out inline-flex items-center px-4 py-2 rounded-lg bg-white/95 text-primary-700 text-xs font-bold shadow-md hover:scale-105',
                  animClass,
                )}
                style={{
                  left: `${layer.positionX}%`,
                  top: `${layer.positionY}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: layer.zIndex,
                  transitionDelay,
                }}
              >
                {layer.content}
              </a>
            );
          }

          if (layer.layerType === 'decorative') {
            return (
              <div
                key={layer.id}
                className={cn('absolute transition-all duration-700 ease-out', animClass)}
                style={{
                  left: `${layer.positionX}%`,
                  top: `${layer.positionY}%`,
                  width: layer.width ? `${layer.width}%` : '40px',
                  height: layer.width ? `${layer.width}%` : '40px',
                  transform: 'translate(-50%, -50%)',
                  zIndex: layer.zIndex,
                  transitionDelay,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            );
          }

          return null;
        })}

      {/* Main image (not shown on mobile when mobile image exists) */}
      {!hasMobileImage && mainUrl && (
        <div
          className={cn(
            'absolute transition-all duration-700 ease-out',
            getAnimationClasses(slide.animationType, isActive, reducedMotion),
          )}
          style={{
            [slide.contentPosition === 'center'
              ? 'left'
              : slide.contentPosition === 'left'
                ? 'left'
                : 'right']: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '45%',
            maxWidth: '400px',
            zIndex: 5,
          } as React.CSSProperties}
        >
          <img
            src={mainUrl}
            alt={slide.title ?? slide.internalName}
            className="w-full h-auto object-contain"
            loading="lazy"
          />
        </div>
      )}

      {/* Text content block */}
      {!hasMobileImage && (slide.eyebrow || slide.title || slide.description || slide.ctaText) && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col justify-center p-4 sm:p-6 lg:p-8',
            contentPositionClass,
            textColorClass,
          )}
          style={{ zIndex: 10 }}
        >
          <div
            className={cn(
              'max-w-sm sm:max-w-md space-y-1.5 sm:space-y-2',
              getAnimationClasses(slide.animationType, isActive, reducedMotion),
            )}
          >
            {slide.eyebrow && (
              <p
                className={cn(
                  'text-[10px] sm:text-xs font-bold uppercase tracking-wider',
                  slide.textColor === 'light' ? 'text-white/80' : 'text-neutral-500',
                  dropShadow,
                )}
              >
                {slide.eyebrow}
              </p>
            )}
            {slide.title && (
              <h3
                className={cn(
                  'font-extrabold text-sm sm:text-lg lg:text-xl leading-tight',
                  dropShadow,
                )}
              >
                {slide.title}
              </h3>
            )}
            {slide.description && (
              <p
                className={cn(
                  'text-xs sm:text-sm leading-relaxed line-clamp-2',
                  slide.textColor === 'light' ? 'text-white/90' : 'text-neutral-600',
                  dropShadow,
                )}
              >
                {slide.description}
              </p>
            )}
            {(slide.ctaText || slide.cta2Text) && (
              <div className="flex flex-wrap items-center gap-2 pt-1.5 sm:pt-2">
                {slide.ctaText && (
                  <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white/95 text-primary-700 text-xs sm:text-sm font-bold shadow-md transition-transform hover:scale-105">
                    {slide.ctaText}
                  </span>
                )}
                {slide.cta2Text && (
                  <span className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-white/40 text-xs sm:text-sm font-bold backdrop-blur-sm transition-transform hover:scale-105">
                    {slide.cta2Text}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile simplified overlay (when mobile image exists) */}
      {hasMobileImage && (slide.title || slide.ctaText) && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col justify-end p-3',
            'items-end text-right',
            textColorClass,
          )}
          style={{ zIndex: 10 }}
        >
          <div
            className={cn(
              'max-w-[70%] space-y-1',
              getAnimationClasses(slide.animationType, isActive, reducedMotion),
            )}
          >
            {slide.title && (
              <h3 className={cn('font-extrabold text-xs sm:text-sm leading-tight', dropShadow)}>
                {slide.title}
              </h3>
            )}
            {slide.ctaText && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/95 text-primary-700 text-[10px] font-bold shadow-md">
                {slide.ctaText}
              </span>
            )}
          </div>
        </div>
      )}
    </Wrapper>
  );
}

export const SlideRenderer = memo(SlideRendererImpl);
