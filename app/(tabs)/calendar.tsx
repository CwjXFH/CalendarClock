import { ScreenContainer } from '@/components/screen-container';
import { SiteView } from '@/components/site-view';

/** 万年历站点 */
const CALENDAR_URL = 'https://wannianli.site/';

export default function CalendarScreen() {
  return (
    <ScreenContainer>
      <SiteView url={CALENDAR_URL} />
    </ScreenContainer>
  );
}
