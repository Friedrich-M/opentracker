import { Switch } from '@umami/react-zen';
import { useMessages, useNavigation } from '@/components/hooks';

/**
 * Shows or hides the owner's own visits and local previews (website_event.
 * internal). Off by default; the choice lives in the URL as includeInternal.
 */
export function IncludeInternalSwitch() {
  const { t, labels } = useMessages();
  const { router, updateParams, query } = useNavigation();

  const handleChange = (selected: boolean) => {
    router.push(updateParams({ includeInternal: selected ? 'true' : undefined }));
  };

  return (
    <Switch isSelected={!!query.includeInternal} onChange={handleChange} size="sm">
      {t(labels.includeMyVisits)}
    </Switch>
  );
}
