import { useEffect } from 'react';
import { PageHead, Card, NoData, type BiText } from '../../../components/ui';
import { LiveDataSettingCard } from '../../lms-live';

/* Project and commercial parameters are not stored on the server yet; none are shown until they are. */
const PROJECT_TEXT: BiText = {
  en: 'Project and commercial parameters are not stored on the server yet. They will appear here once the settings module is connected.',
  mr: 'प्रकल्प व व्यावसायिक मापदंड अद्याप सर्व्हरवर साठवले जात नाहीत. सेटिंग्ज मॉड्यूल सर्व्हरशी जोडल्यावर ते येथे दिसतील.',
};

/* System settings: the live "Show live LMS data" switch (G-2), and an honest empty state for everything else. */
export default function SettingsPage() {
  useEffect(() => {
    document.title = 'System settings — AMRUT × SUMAGO Admin';
  }, []);
  return (
    <div className="page">
      <PageHead crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'System settings' }]} title="System Settings" />
      <LiveDataSettingCard />
      <Card title="Project parameters">
        <NoData msg={PROJECT_TEXT} />
      </Card>
    </div>
  );
}
