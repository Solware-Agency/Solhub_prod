import { useEffect, useState } from 'react'

// Breakpoint sizes matching Tailwind's default breakpoints
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

type Breakpoint = keyof typeof breakpoints

/**
 * Hook to check if the current viewport matches a media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  return matches
}

/**
 * Hook to check if the current viewport is at least a certain breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[breakpoint]}px)`)
}

/**
 * Component that renders children only if the media query matches
 */
interface MediaQueryProps {
  query: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function MediaQuery({ query, children, fallback = null }: MediaQueryProps) {
  const matches = useMediaQuery(query)
  return matches ? <>{children}</> : <>{fallback}</>
}

/**
 * Component that renders children only if the viewport is at least a certain breakpoint
 */
interface BreakpointProps {
  min?: Breakpoint
  max?: Breakpoint
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function Breakpoint({ min, max, children, fallback = null }: BreakpointProps) {
  let query = ''
  
  if (min && max) {
    query = `(min-width: ${breakpoints[min]}px) and (max-width: ${breakpoints[max] - 0.02}px)`
  } else if (min) {
    query = `(min-width: ${breakpoints[min]}px)`
  } else if (max) {
    query = `(max-width: ${breakpoints[max] - 0.02}px)`
  }
  
  const matches = useMediaQuery(query)
  return matches ? <>{children}</> : <>{fallback}</>
}