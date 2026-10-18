import { Button, Icon } from '@umami/react-zen';
import { Download } from 'lucide-react';
import { DataGrid } from '@/components/common/DataGrid';
import { useMessages, useWebsiteSessionsQuery } from '@/components/hooks';
import { sessionsToCsv, VisitorActivity } from './VisitorActivity';

// Sessions have one layout: the folded Visitor Activity list (owner's
// request, 2026-10-11), so the grid's table/cards toggle is off.
export function SessionsDataTable({ websiteId }: { websiteId: string }) {
  const queryResult = useWebsiteSessionsQuery(websiteId);
  const { t, labels } = useMessages();
  const rows = queryResult.data?.data ?? [];

  // Exports the sessions on the current page, with the active filters.
  const handleExport = () => {
    const blob = new Blob([sessionsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      query={queryResult}
      allowPaging
      allowSearch
      allowDisplayMode={false}
      renderActions={() => (
        <Button variant="quiet" onPress={handleExport} isDisabled={!rows.length}>
          <Icon>
            <Download />
          </Icon>
          {t(labels.export)}
        </Button>
      )}
    >
      {({ data }) => <VisitorActivity data={data} />}
    </DataGrid>
  );
}
