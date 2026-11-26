import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AS from '../../../legacy';
import { useAuth } from '../auth-context';
import { canOpenPath, homePath } from '../home';
import { ApiError } from '../../../services/api-client';
import { publicUrl } from '../../../utils/publicSite';

/*
 * Sign-in screen (design ported from assets/js/pages/public.js). Authenticates against the backend:
 * POST /api/v1/auth/login with email + password; errors from the API are shown inline.
 */
export default function LoginPage() {
  const CT = AS.content;
  const U = AS.ui;
  const { status, login, permissions, hiddenMenus, portal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLangState] = useState(CT.getLang());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Sign in — SARTHI Admin';
  }, []);

  if (status === 'authenticated') return <Navigate to={homePath({ permissions, hiddenMenus, portal })} replace />;

  const mr = lang === 'mr';
  const T = (m: string, en: string): string => (mr ? m : en);
  const from = (location.state as { from?: string } | null)?.from;

  function setLang(l: 'mr' | 'en') {
    CT.setLang(l);
    setLangState(l);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError(T('ईमेल आणि पासवर्ड आवश्यक आहेत.', 'Email and password are required.'));
      return;
    }
    setBusy(true);
    try {
      const me = await login(email.trim(), password);
      U.toast('Signed in as ' + me.name, 'ok');
      /* Back to the page that asked for the sign-in when this account may open it, else the account's start screen. */
      const access = { permissions: new Set(me.permissions), hiddenMenus: new Set(me.hiddenMenus ?? []), portal: me.portal };
      navigate(from && canOpenPath(from, access) ? from : homePath(access), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError(T('ईमेल किंवा पासवर्ड चुकीचा आहे.', 'Invalid email or password.'));
      else if (err instanceof ApiError && err.status === 429)
        setError(T('खूप प्रयत्न झाले. थोड्या वेळाने पुन्हा प्रयत्न करा.', 'Too many attempts. Please try again later.'));
      else setError(err instanceof ApiError ? err.fullMessage : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  function forgot() {
    U.modal({
      title: 'Reset password',
      body: U.callout(
        'info',
        '',
        'Self-service password reset is not enabled. Ask an administrator with the users.update permission to set a new password for your account.',
      ),
      footer: '<button class="btn primary" data-modal-close>OK</button>',
    });
  }

  const pub = (p: string) => {
    window.location.href = publicUrl(p);
  };

  return (
    <div className="auth">
      <div className="auth-l">
        <div className="f ac gp10">
          <div>
            <b style={{ fontSize: 19, display: 'block', fontFamily: 'var(--serif)', letterSpacing: '.5px', color: '#DD792E' }}>
              SARTHI
            </b>
            <span style={{ fontSize: 12, color: '#E3CBB4' }}>
              {T('कौशल्य विकास कार्यक्रम व्यवस्थापन पोर्टल', 'Skill Development Programme Management Portal')}
            </span>
          </div>
        </div>
        <div style={{ margin: 'auto 0', padding: '52px 0', maxWidth: 470 }}>
          <h1 style={{ color: '#fff', fontSize: 30, lineHeight: 1.25, fontFamily: 'var(--serif)' }}>
            {T('अर्जापासून प्रमाणपत्रापर्यंत — एकाच पोर्टलवर.', 'From application to certificate — one portal.')}
          </h1>
          <p style={{ color: '#F0D9C0', fontSize: 14.5, marginTop: 14 }}>
            {T(
              'सारथी २.० अंतर्गत मोबिलायझेशन, पडताळणी, प्रवेश, प्रशिक्षण, उपस्थिती, मूल्यमापन व प्रमाणपत्र — महाराष्ट्रातील ३६ जिल्ह्यांमध्ये, दोन स्वतंत्र प्रशिक्षण पद्धतींसह.',
              'Mobilization, verification, enrollment, training, attendance, assessment and certification for Sarthi 2.0 — across 36 districts of Maharashtra, in two independent training modes.',
            )}
          </p>
        </div>
      </div>

      <div className="auth-r">
        <div className="auth-box">
          <div className="f jb ac mb14">
            <div className="lang-toggle">
              <button type="button" className={mr ? 'on' : ''} onClick={() => setLang('mr')}>
                मराठी
              </button>
              <button type="button" className={!mr ? 'on' : ''} onClick={() => setLang('en')}>
                English
              </button>
            </div>
          </div>
          <h2 style={{ fontSize: 22, fontFamily: 'var(--serif)', color: 'var(--maroon)' }}>
            {T('पोर्टलमध्ये प्रवेश करा', 'Sign in to the portal')}
          </h2>
          <p className="muted fs13">
            {T(
              'भूमिकेनुसार प्रवेश. आपल्या खात्याचा ईमेल व पासवर्ड वापरा.',
              'Role-based access. Sign in with your account email and password.',
            )}
          </p>
          <form onSubmit={submit} noValidate>
            <div style={{ marginTop: 14 }}>
              <div className="fld mb10">
                <label htmlFor="lg-user">{T('ईमेल', 'Email')}</label>
                <input
                  className="inp"
                  id="lg-user"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div className="fld mb10">
                <label htmlFor="lg-pass">{T('पासवर्ड', 'Password')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="inp"
                    id="lg-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? T('पासवर्ड लपवा', 'Hide password') : T('पासवर्ड दाखवा', 'Show password')}
                    aria-pressed={showPassword}
                    title={showPassword ? T('पासवर्ड लपवा', 'Hide password') : T('पासवर्ड दाखवा', 'Show password')}
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 0,
                      padding: 6,
                      cursor: 'pointer',
                      color: 'var(--ink-3, #6b7280)',
                      display: 'flex',
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                      {showPassword ? <line x1="3" y1="3" x2="21" y2="21" /> : null}
                    </svg>
                  </button>
                </div>
              </div>
              <div className="f jb ac mb14">
                <span className="fs12 muted">{T('सत्र हा टॅब बंद होईपर्यंत राहते.', 'Your session lasts until this tab is closed.')}</span>
                <a className="fs12 pointer" onClick={forgot}>
                  {T('पासवर्ड विसरलात?', 'Forgot password?')}
                </a>
              </div>
            </div>
            {error && (
              <div className="hint mb10" style={{ color: 'var(--red)' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn primary block" disabled={busy}>
              {busy ? T('प्रवेश करत आहे…', 'Signing in…') : T('प्रवेश करा', 'Sign in')}
            </button>
          </form>

          <div className="sep" />
          <div className="f jb ac wrap gp8">
            <button type="button" className="btn ghost sm" onClick={() => pub('/track')}>
              {CT.t('checkStatus')}
            </button>
            <button type="button" className="btn ghost sm" onClick={() => pub('/verify')}>
              {CT.t('verifyCert')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
