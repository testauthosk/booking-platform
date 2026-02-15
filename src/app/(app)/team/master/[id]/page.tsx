'use client';

import { use } from 'react';
import { MasterForm } from '@/components/staff/master-form';

export default function EditMasterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MasterForm masterId={id} />;
}
