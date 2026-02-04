'use client';

import { ReactNode } from 'react';

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ viewTransitionName: 'page' }}>
      {children}
    </div>
  );
}
