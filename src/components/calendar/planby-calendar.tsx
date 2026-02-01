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

// Custom channel/resource item
const ChannelItem = ({ channel }: { channel: any }) => {
  return (
    <div className="flex items-center justify-center h-full px-2 text-sm font-medium truncate">
      {channel.title}
    </div>
  );
};

// Custom program/event item
const ProgramItem = ({ program, onClick }: { program: any; onClick?: (event: BookingEvent) => void }) => {
  const { data, styles } = program;
  
  return (
    <div
      className="rounded-md overflow-hidden cursor-pointer transition-shadow hover:shadow-lg"
      style={{
        ...styles.position,
        backgroundColor: data.backgroundColor || '#4eb8d5',
      }}
      onClick={() => onClick?.(data.originalEvent)}
    >
      <div className="p-2 text-white text-xs h-full">
        <div className="font-semibold truncate">{data.clientName}</div>
        <div className="opacity-80 truncate">{data.title}</div>
      </div>
    </div>
  );
};

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
      title: r.title,
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
      since: e.start.toISOString(),
      till: e.end.toISOString(),
      image: '',
      // Custom data
      backgroundColor: e.backgroundColor,
      clientName: e.clientName,
      originalEvent: e,
    })),
    [events]
  );

  const {
    getEpgProps,
    getLayoutProps,
  } = useEpg({
    epg,
    channels,
    startDate: `${todayStr}T08:00:00`,
    endDate: `${todayStr}T21:00:00`,
    isBaseTimeFormat: false,
    isSidebar: true,
    isTimeline: true,
    isLine: true,
    dayWidth: 7800, // 13 hours * 600px per hour
    sidebarWidth: 100,
    itemHeight: 80,
    theme: {
      primary: {
        600: '#1a1a1a',
        900: '#0f0f0f',
      },
      grey: {
        300: '#d1d5db',
      },
      white: '#ffffff',
      green: {
        300: '#4eb8d5',
      },
      loader: {
        teal: '#4eb8d5',
        purple: '#8b5cf6',
        pink: '#ec4899',
        bg: '#1e1e1e',
      },
      scrollbar: {
        border: '#ffffff',
        thumb: {
          bg: '#e1e1e1',
        },
      },
      gradient: {
        blue: {
          300: '#4eb8d5',
          600: '#3a9cb8',
          900: '#2d7a91',
        },
      },
      text: {
        grey: {
          300: '#a0a0a0',
          500: '#6b7280',
        },
      },
      timeline: {
        divider: {
          bg: '#e5e7eb',
        },
      },
    },
  });

  return (
    <div className="h-full w-full planby-calendar">
      <style jsx global>{`
        .planby-calendar {
          font-family: inherit;
        }
        .planby-calendar .planby {
          font-family: inherit !important;
        }
        .planby-calendar .planby-sidebar-item {
          background: hsl(var(--background)) !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        .planby-calendar .planby-timeline-box {
          background: hsl(var(--background)) !important;
        }
        .planby-calendar .planby-timeline-wrapper {
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        .planby-calendar .planby-layout-content {
          background: hsl(var(--background)) !important;
        }
        .planby-calendar .planby-program-content {
          border-radius: 6px !important;
        }
        .planby-calendar .planby-line {
          background: #ef4444 !important;
        }
      `}</style>
      
      <Epg {...getEpgProps()}>
        <Layout
          {...getLayoutProps()}
          renderChannel={({ channel }) => (
            <ChannelItem channel={channel} />
          )}
          renderProgram={({ program }) => (
            <ProgramItem program={program} onClick={onEventClick} />
          )}
        />
      </Epg>
    </div>
  );
}
