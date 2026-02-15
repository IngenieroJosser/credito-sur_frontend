'use client';

import dynamic from 'next/dynamic';

const OfflineIndicator = dynamic(() => import('./OfflineIndicator'), { ssr: false });

export default function OfflineIndicatorWrapper() {
  return <OfflineIndicator />;
}
