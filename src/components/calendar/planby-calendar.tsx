'use client';

import React, { useMemo } from 'react';
import { Epg, Layout, useEpg } from 'planby';

export interface BookingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  backgroundColor?: string;
  clientName?: string;
  clientPhone?: string;
  serviceName?: string;
  masterName?: string;
  status?: string;
}

export interface Resource {
  id: string;
  title: string;
  color?: string;
}

interface PlanbyCalendarProps {
  events?: BookingEvent[];
  resources?: Resource[];
  onEventClick?: (event: BookingEvent) => void;
}

export function PlanbyCalendar({
  events = [],
  resources = [],
  onEventClick,
}: PlanbyCalendarProps) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Convert resources to Planby channels format
  const channels = useMemo(() => 
    resources.map(r => ({
      uuid: r.id,
      logo: '',
    })),
    [resources]
  );

  // Convert events to Planby epg format
  const epg = useMemo(() => 
    events.map(e => ({
      id: e.id,
      channelUuid: e.resourceId || '',
      title: e.title,
      since: `${todayStr}T${e.start.toTimeString().slice(0, 8)}`,
      till: `${todayStr}T${e.end.toTimeString().slice(0, 8)}`,
      image: '',
    })),
    [events, todayStr]
  );

  const { getEpgProps, getLayoutProps } = useEpg({
    epg,
    channels,
    startDate: `${todayStr}T08:00:00`,
  });

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Epg {...getEpgProps()}>
        <Layout {...getLayoutProps()} />
      </Epg>
    </div>
  );
}
