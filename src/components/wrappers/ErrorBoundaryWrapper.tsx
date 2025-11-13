/**
 * ErrorBoundaryWrapper
 *
 * Wrapper component to use ErrorBoundary in Astro layouts
 * This allows us to wrap slot content with React ErrorBoundary
 */

import React, { ReactNode } from 'react';
import ErrorBoundary from '../ErrorBoundary';

interface Props {
  children: ReactNode;
}

export default function ErrorBoundaryWrapper({ children }: Props) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
