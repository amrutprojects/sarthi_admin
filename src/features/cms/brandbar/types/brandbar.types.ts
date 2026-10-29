/* The Brand Bar, as /api/v1/cms/brand-bar returns and accepts it. */

/** A Marathi/English pair. */
export interface Bilingual {
  mr: string;
  en: string;
}

/**
 * The white bar directly under the top bar of the website: the bold title (AMRUT KALASH), the academy's full name
 * in Marathi and in English underneath, and the implementation partner at the right.
 */
export interface ApiBrandBar {
  id: string;
  /** The bold title at the left ("AMRUT KALASH"); never blank. */
  title: string;
  /** The two full-name lines under the title, both shown whatever the visitor's language; a blank line is not shown. */
  fullName: Bilingual;
  /** The small label above the partner name ("Implementation Partner"), in the visitor's language; blank in both when not shown. */
  partnerLabel: Bilingual;
  /** The bold partner name at the right ("SUMAGO INFOTECH PVT LTD"); blank leaves the whole partner block out. */
  partnerName: string;
  createdAt: string;
  updatedAt: string;
}

/** The update body: every key is required, and the whole bar is replaced. */
export interface UpdateBrandBarInput {
  title: string;
  fullName: Bilingual;
  /** Blank in both languages leaves the small label out. */
  partnerLabel: Bilingual;
  partnerName: string;
  /** The updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

/* Error keys are paths, because some texts are pairs — "fullName.mr". */
export type BrandBarField = string;
