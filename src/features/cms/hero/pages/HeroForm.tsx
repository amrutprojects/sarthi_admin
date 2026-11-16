import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { Callout } from '../../../../components/ui';
import Icon from '../../../../components/ui/Icon';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import type { HeroField, HeroGlance } from '../types/hero.types';
import {
  HERO_LINK_PAGES,
  MAX_SLIDES,
  emptySlide,
  validateHeroForm,
  type HeroFormValues,
  type SlideFormValues,
} from '../validation/hero.validation';

const FORM_ID = 'cms-hero-form';

/*
 * The home page's rotating banner editor.
 *
 * Each slide carries its own tag, heading, description and button; the two buttons under every slide
 * ("Learn more" and "Check Application Status") are one pair of labels for the whole banner.
 *
 * The "Programme at a glance" card beside the slides has one entered figure, the district count; the
 * other three are summed from the Modules page and shown disabled, so the card can be read whole here.
 */
export default function HeroForm({
  initial,
  glance,
  onSave,
  backTo,
}: {
  initial: HeroFormValues;
  /* The figures as the form was opened with them; null when the Modules page content is not configured. */
  glance: HeroGlance | null;
  onSave: (values: HeroFormValues) => Promise<void>;
  backTo: string;
}) {
  const [values, setValues] = useState<HeroFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<HeroField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateHeroForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));

  const change = (next: HeroFormValues) => {
    setValues(next);
    setDirty(true);
  };

  /* Editing the list shifts indexes, so flags and messages keyed by them no longer apply. */
  const changeList = (next: HeroFormValues) => {
    setValues(next);
    setDirty(true);
    setTouched({});
    setServerErrors({});
  };

  const patchSlide = (index: number, patch: Partial<SlideFormValues>) =>
    change({ ...values, slides: values.slides.map((s, k) => (k === index ? { ...s, ...patch } : s)) });

  /* The slides make this a long page: bring the first message into view, since Save sits at the bottom. */
  const revealFirstError = () =>
    document
      .getElementById(FORM_ID)
      ?.querySelector('[aria-invalid="true"], [role="alert"]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    flushSync(() => setSubmitted(true));
    if (!isValid(local)) {
      revealFirstError();
      return;
    }

    setBusy(true);
    setServerErrors({});
    try {
      await onSave(values);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped: FieldErrors<HeroField> = {};
        for (const d of err.details) {
          if (!d.field) continue;
          mapped[d.field.replace(/^body\./, '')] = d.message;
        }
        flushSync(() => setServerErrors(mapped));
        if (!isValid(mapped)) {
          revealFirstError();
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const move = (index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= values.slides.length) return;
    const next = [...values.slides];
    const [row] = next.splice(index, 1);
    next.splice(to, 0, row!);
    changeList({ ...values, slides: next });
  };

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Buttons on every slide</h3>
          </div>
          <div className="card-b">
            <p className="muted fs12 mb10">The two buttons under each slide&rsquo;s own button. They are the same on every slide.</p>
            <BilingualField
              id="hero-readmore"
              label="Learn more button"
              maxLength={60}
              value={values.readMoreLabel}
              onChange={(readMoreLabel) => change({ ...values, readMoreLabel })}
              onBlur={(half) => touch(`readMoreLabel.${half}`)}
              errorMr={show('readMoreLabel.mr')}
              errorEn={show('readMoreLabel.en')}
              hint="Opens the Programme page."
            />
            <div className="mt10">
              <BilingualField
                id="hero-status"
                label="Check status button"
                maxLength={60}
                value={values.checkStatusLabel}
                onChange={(checkStatusLabel) => change({ ...values, checkStatusLabel })}
                onBlur={(half) => touch(`checkStatusLabel.${half}`)}
                errorMr={show('checkStatusLabel.mr')}
                errorEn={show('checkStatusLabel.en')}
                hint="Opens the Track application page."
              />
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Slides</h3>
            <span className="muted fs12">{values.slides.length} listed</span>
          </div>
          <div className="card-b">
            <p className="muted fs12 mb10">
              The banner rotates through the visible slides in this order. Unticking one keeps it here but removes it from the website.
            </p>

            {show('slides') ? (
              <p className="err fs12 mb10" role="alert">
                {show('slides')}
              </p>
            ) : null}

            {values.slides.map((s, i) => {
              const linkId = `hero-slide-${i}-link`;
              const linkError = show(`slides.${i}.ctaLink`);
              /* A link saved before this list existed stays selectable, so opening the form never changes it. */
              const listed = HERO_LINK_PAGES.some((p) => p.path === s.ctaLink);
              return (
                <div className="card mb10" key={i} role="group" aria-label={`Slide ${i + 1}`}>
                  <div className="card-b">
                    <div className="f ac gp8 wrap mb10">
                      <b className="fs13">Slide {i + 1}</b>
                      <span className="flex1" />
                      <label className="f ac gp8 fs13">
                        <input type="checkbox" checked={s.isActive} onChange={(e) => patchSlide(i, { isActive: e.target.checked })} />
                        {s.isActive ? 'Visible' : 'Hidden'}
                      </label>
                      <button type="button" className="btn sm" disabled={i === 0} onClick={() => move(i, -1)}>
                        Move up
                      </button>
                      <button type="button" className="btn sm" disabled={i === values.slides.length - 1} onClick={() => move(i, 1)}>
                        Move down
                      </button>
                      <button
                        type="button"
                        className="btn sm danger"
                        onClick={() => changeList({ ...values, slides: values.slides.filter((_, k) => k !== i) })}
                      >
                        Remove
                      </button>
                    </div>

                    <BilingualField
                      id={`hero-slide-${i}-tag`}
                      label="Tag"
                      maxLength={60}
                      value={s.tag}
                      onChange={(tag) => patchSlide(i, { tag })}
                      onBlur={(half) => touch(`slides.${i}.tag.${half}`)}
                      errorMr={show(`slides.${i}.tag.mr`)}
                      errorEn={show(`slides.${i}.tag.en`)}
                      hint="The small label above the heading."
                    />
                    <div className="mt10">
                      <BilingualField
                        id={`hero-slide-${i}-title`}
                        label="Heading"
                        maxLength={200}
                        value={s.title}
                        onChange={(title) => patchSlide(i, { title })}
                        onBlur={(half) => touch(`slides.${i}.title.${half}`)}
                        errorMr={show(`slides.${i}.title.mr`)}
                        errorEn={show(`slides.${i}.title.en`)}
                      />
                    </div>
                    <div className="mt10">
                      <BilingualField
                        id={`hero-slide-${i}-desc`}
                        label="Description"
                        maxLength={400}
                        multiline
                        value={s.description}
                        onChange={(description) => patchSlide(i, { description })}
                        onBlur={(half) => touch(`slides.${i}.description.${half}`)}
                        errorMr={show(`slides.${i}.description.mr`)}
                        errorEn={show(`slides.${i}.description.en`)}
                      />
                    </div>
                    <div className="mt10">
                      <BilingualField
                        id={`hero-slide-${i}-cta`}
                        label="Button label"
                        maxLength={60}
                        value={s.ctaLabel}
                        onChange={(ctaLabel) => patchSlide(i, { ctaLabel })}
                        onBlur={(half) => touch(`slides.${i}.ctaLabel.${half}`)}
                        errorMr={show(`slides.${i}.ctaLabel.mr`)}
                        errorEn={show(`slides.${i}.ctaLabel.en`)}
                      />
                    </div>
                    <div className="mt10">
                      <MasterField id={linkId} label="Button link" required error={linkError} hint="The page this slide's button opens.">
                        <select
                          className="inp"
                          {...fieldAria(linkId, linkError)}
                          value={s.ctaLink}
                          onChange={(e) => patchSlide(i, { ctaLink: e.target.value })}
                          onBlur={() => touch(`slides.${i}.ctaLink`)}
                        >
                          {!s.ctaLink ? <option value="">Choose a page…</option> : null}
                          {s.ctaLink && !listed ? <option value={s.ctaLink}>{s.ctaLink}</option> : null}
                          {HERO_LINK_PAGES.map((p) => (
                            <option key={p.path} value={p.path}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </MasterField>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className="btn sm"
              disabled={values.slides.length >= MAX_SLIDES}
              onClick={() => changeList({ ...values, slides: [...values.slides, emptySlide()] })}
            >
              <Icon name="plus" />
              Add a slide
            </button>
            {values.slides.length >= MAX_SLIDES ? <p className="muted fs12 mt10">The banner holds at most {MAX_SLIDES} slides.</p> : null}
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Programme at a glance</h3>
          </div>
          <div className="card-b">
            {glance && values.districtCount !== null ? (
              <>
                <Callout tone="info" title="Three of these four are worked out, not entered">
                  Total hours, modules and employment domains are summed from the modules on the Modules Page screen, so they can never
                  disagree with it. To change them, change the modules.
                </Callout>

                <div className="grid g2 mt14">
                  <MasterField id="hero-glance-hours" label="Total hours">
                    <input id="hero-glance-hours" className="inp" type="text" value={glance.totalHours} readOnly disabled />
                  </MasterField>
                  <MasterField id="hero-glance-modules" label="Modules">
                    <input id="hero-glance-modules" className="inp" type="text" value={glance.modulesLabel} readOnly disabled />
                  </MasterField>
                  <MasterField id="hero-glance-domains" label="Employment domains">
                    <input id="hero-glance-domains" className="inp" type="text" value={glance.domains} readOnly disabled />
                  </MasterField>
                  <MasterField
                    id="districtCount"
                    label="Districts"
                    required
                    error={show('districtCount')}
                    hint="The headline figure on the home page only — the map and the district pages are drawn from the programme dataset."
                  >
                    <input
                      className="inp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      {...fieldAria('districtCount', show('districtCount'))}
                      value={values.districtCount}
                      onChange={(e) => change({ ...values, districtCount: e.target.value })}
                      onBlur={() => touch('districtCount')}
                    />
                  </MasterField>
                </div>

                {glance.hiddenModules > 0 ? (
                  <p className="muted fs12 mt10">
                    {glance.hiddenModules} module{glance.hiddenModules === 1 ? ' is' : 's are'} hidden, so{' '}
                    {glance.hiddenModules === 1 ? 'it is' : 'they are'} left out of the figures above and out of the website.
                  </p>
                ) : null}
              </>
            ) : (
              <Callout tone="warn">The programme content has not been configured yet. Run the database seed to create it.</Callout>
            )}
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Visibility</h3>
          </div>
          <div className="card-b">
            <label className="f ac gp8 fs13">
              <input type="checkbox" checked={values.isPublished} onChange={(e) => change({ ...values, isPublished: e.target.checked })} />
              Publish this section on the public website
            </label>
            {!values.isPublished ? (
              <p className="muted fs12 mt10">
                While unpublished the banner is hidden from the website, the &ldquo;Programme at a glance&rdquo; card inside it included.
              </p>
            ) : null}
          </div>
        </div>
      </form>

      <MasterFormActions formId={FORM_ID} submitLabel="Save changes" busy={busy} dirty={dirty} backTo={backTo} />
    </>
  );
}
