import { cn } from '@/lib/utils';

/**
 * Placeholder portrait, drawn from the preset's gradient. Swap the whole body
 * for an `<img src={thumbnailUrl}>` once the organization's Avatar catalog is
 * wired up — the catalog exposes a thumbnail per avatar.
 */
export function AvatarPortrait({
  gradient,
  className,
}: {
  gradient: [string, string];
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full',
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(150deg, ${gradient[0]}, ${gradient[1]})`,
      }}
    >
      <svg
        viewBox="0 0 48 48"
        className="absolute bottom-0 h-[78%] w-auto"
        aria-hidden="true"
      >
        <circle cx="24" cy="15" r="8.4" fill="rgba(255,255,255,0.42)" />
        <path
          d="M6 48c0-9.9 8.1-17.4 18-17.4S42 38.1 42 48Z"
          fill="rgba(255,255,255,0.42)"
        />
      </svg>
      <span
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
        }}
      />
    </span>
  );
}

export function ScenePreview({
  gradient,
  className,
  plain = false,
}: {
  gradient: [string, string];
  className?: string;
  /** Drops the thumbnail-scale set dressing, which reads as dirt when large. */
  plain?: boolean;
}) {
  return (
    <span
      className={cn('relative block overflow-hidden rounded-xl', className)}
      style={{
        backgroundImage: `linear-gradient(165deg, ${gradient[0]}, ${gradient[1]})`,
      }}
    >
      <span className="absolute inset-x-0 bottom-0 h-1/3 bg-black/22" />
      {plain ? null : (
        <>
          <span className="absolute top-[18%] left-[16%] size-6 rounded-full bg-white/22 blur-[2px]" />
          <span className="absolute right-[14%] bottom-[26%] h-8 w-10 rounded-md bg-white/14" />
        </>
      )}
    </span>
  );
}
