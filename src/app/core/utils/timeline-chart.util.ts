export type MarkerKind = 'savepoint' | 'memory' | 'achievement' | 'life-event';

export interface TimelineMarkerItem {
  id: string;
  kind: MarkerKind;
  leftPercent: number;
  title: string;
  subtitle?: string;
  description?: string;
  date: string;
}

export interface MarkerCluster {
  key: string;
  leftPercent: number;
  items: TimelineMarkerItem[];
}

export function parseTimelineDate(iso: string): number {
  return new Date(`${iso}T00:00:00`).getTime();
}

export function formatTimelineDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** Greedily groups items whose horizontal position is within `thresholdPercent` of the previous one. */
export function clusterMarkers(items: TimelineMarkerItem[], thresholdPercent = 2): MarkerCluster[] {
  if (items.length === 0) {
    return [];
  }
  const sorted = [...items].sort((a, b) => a.leftPercent - b.leftPercent);
  const clusters: TimelineMarkerItem[][] = [];
  let current: TimelineMarkerItem[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1];
    if (sorted[i].leftPercent - prev.leftPercent <= thresholdPercent) {
      current.push(sorted[i]);
    } else {
      clusters.push(current);
      current = [sorted[i]];
    }
  }
  clusters.push(current);

  return clusters.map((clusterItems) => ({
    key: clusterItems.map((item) => item.id).join('|'),
    leftPercent: clusterItems.reduce((sum, item) => sum + item.leftPercent, 0) / clusterItems.length,
    items: clusterItems,
  }));
}
