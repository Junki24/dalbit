import './Skeleton.css'

interface SkeletonProps {
  width?: string
  height?: string
  radius?: string
  className?: string
}

export function Skeleton({ width, height = '16px', radius, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  )
}

export function SkeletonCircle({ size = '48px' }: { size?: string }) {
  return <div className="skeleton skeleton--circle" style={{ width: size, height: size }} />
}

/** Home page skeleton */
export function HomePageSkeleton() {
  return (
    <div className="skeleton-page">
      {/* Cycle circle */}
      <div className="skeleton-center">
        <SkeletonCircle size="160px" />
      </div>
      {/* Phase card */}
      <Skeleton height="72px" radius="var(--radius-lg)" />
      {/* Prediction grid */}
      <div className="skeleton-grid-2">
        <Skeleton height="90px" radius="var(--radius-lg)" />
        <Skeleton height="90px" radius="var(--radius-lg)" />
        <Skeleton height="90px" radius="var(--radius-lg)" />
        <Skeleton height="90px" radius="var(--radius-lg)" />
      </div>
      {/* Quick actions */}
      <div className="skeleton-row">
        <Skeleton height="48px" radius="var(--radius-md)" />
        <Skeleton height="48px" radius="var(--radius-md)" />
      </div>
    </div>
  )
}

/** Calendar page skeleton */
export function CalendarPageSkeleton() {
  return (
    <div className="skeleton-page">
      {/* Month nav */}
      <div className="skeleton-row-between">
        <SkeletonCircle size="38px" />
        <Skeleton width="120px" height="22px" radius="8px" />
        <SkeletonCircle size="38px" />
      </div>
      {/* Legend */}
      <Skeleton height="32px" radius="var(--radius-md)" />
      {/* Calendar grid */}
      <Skeleton height="320px" radius="var(--radius-lg)" />
    </div>
  )
}

/** Stats page skeleton */
export function StatsPageSkeleton() {
  return (
    <div className="skeleton-page">
      <Skeleton height="120px" radius="var(--radius-lg)" />
      <div className="skeleton-grid-2">
        <Skeleton height="72px" radius="var(--radius-md)" />
        <Skeleton height="72px" radius="var(--radius-md)" />
      </div>
      <Skeleton height="160px" radius="var(--radius-lg)" />
      <Skeleton height="140px" radius="var(--radius-lg)" />
    </div>
  )
}
