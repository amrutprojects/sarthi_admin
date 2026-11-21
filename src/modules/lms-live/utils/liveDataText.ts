import type { LiveDataBlocker } from '../types/lmsLive.types';

/* Labels in English and Marathi (System Settings is used by both). */
export const LIVE_DATA_TEXT = {
  title: { en: 'Show live LMS data', mr: 'LMS चा थेट डेटा दाखवा' },
  help: {
    en: 'On: the LMS screens (Batches, Training centres, Trainers, Live / Offline / Online training, Attendance) read live from the LMS. Off: they show the Panel’s local data, as today.',
    mr: 'चालू: LMS स्क्रीन (बॅच, प्रशिक्षण केंद्रे, प्रशिक्षक, थेट / ऑफलाइन / ऑनलाइन प्रशिक्षण, उपस्थिती) थेट LMS मधून डेटा दाखवतात. बंद: त्या आजच्याप्रमाणे पॅनेलचा स्थानिक डेटा दाखवतात.',
  },
  on: { en: 'On', mr: 'चालू' },
  off: { en: 'Off', mr: 'बंद' },
  blocker: {
    MASTER_SWITCH_OFF: {
      en: 'Cannot be switched on: the server master switch (LMS_READS_ENABLED) is off.',
      mr: 'चालू करता येत नाही: सर्व्हरवरील मुख्य स्विच (LMS_READS_ENABLED) बंद आहे.',
    },
    LMS_NOT_CONFIGURED: {
      en: 'Cannot be switched on: the LMS link is not configured. Enter the LMS URL, tenant key and tenant code on the server.',
      mr: 'चालू करता येत नाही: LMS जोडणी कॉन्फिगर केलेली नाही. सर्व्हरवर LMS URL, टेनंट की आणि टेनंट कोड भरा.',
    },
  } satisfies Record<LiveDataBlocker, { en: string; mr: string }>,
};
