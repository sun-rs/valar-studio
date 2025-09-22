import { useEffect, useRef, useState } from 'react';

export type ValueChangeType = 'increase' | 'decrease' | 'none';

export interface ValueChangeResult {
  changeType: ValueChangeType;
  isAnimating: boolean;
}

/**
 * Hook to detect value changes and provide animation states
 * @param value Current value
 * @param precision Number of decimal places to consider for comparison (default: 2)
 * @param animationDuration Duration of animation in ms (default: 2000)
 */
export const useValueChange = (
  value: number | undefined,
  precision = 2,
  animationDuration = 2000
): ValueChangeResult => {
  const previousValue = useRef<number | undefined>(undefined);
  const [changeType, setChangeType] = useState<ValueChangeType>('none');
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (value === undefined) {
      return;
    }

    if (previousValue.current !== undefined) {
      const currentRounded = Number(value.toFixed(precision));
      const previousRounded = Number(previousValue.current.toFixed(precision));

      if (currentRounded > previousRounded) {
        setChangeType('increase');
        setIsAnimating(true);
      } else if (currentRounded < previousRounded) {
        setChangeType('decrease');
        setIsAnimating(true);
      } else {
        setChangeType('none');
        setIsAnimating(false);
      }

      // Clear existing timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      // Set timeout to stop animation
      if (currentRounded !== previousRounded) {
        animationTimeoutRef.current = setTimeout(() => {
          setIsAnimating(false);
          setChangeType('none');
        }, animationDuration);
      }
    }

    previousValue.current = value;
  }, [value, precision, animationDuration]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  return {
    changeType,
    isAnimating,
  };
};

/**
 * Hook to get CSS classes for value change animations
 */
export const useValueChangeClasses = (
  value: number | undefined,
  precision = 2,
  animationDuration = 2000,
  baseClassName = 'value-change-animation'
): string => {
  const { changeType, isAnimating } = useValueChange(value, precision, animationDuration);

  const classes = [baseClassName];

  if (isAnimating) {
    if (changeType === 'increase') {
      classes.push('value-increase');
    } else if (changeType === 'decrease') {
      classes.push('value-decrease');
    }
  }

  return classes.join(' ');
};

/**
 * Hook for table row animations
 */
export const useRowChangeClasses = (
  value: number | undefined,
  precision = 2,
  animationDuration = 3001
): string => {
  const { changeType, isAnimating } = useValueChange(value, precision, animationDuration);

  if (isAnimating) {
    if (changeType === 'increase') {
      return 'table-row-increase';
    } else if (changeType === 'decrease') {
      return 'table-row-decrease';
    }
  }

  return '';
};

/**
 * Hook for statistic card animations
 */
export const useStatCardClasses = (
  value: number | undefined,
  precision = 2,
  animationDuration = 2000
): string => {
  const { changeType, isAnimating } = useValueChange(value, precision, animationDuration);

  if (isAnimating) {
    if (changeType === 'increase') {
      return 'stat-card-increase';
    } else if (changeType === 'decrease') {
      return 'stat-card-decrease';
    }
  }

  return '';
};
