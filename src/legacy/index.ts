/*
 * Loads the shared non-page modules from the original portal, in their original order.
 * They are plain IIFEs that register onto window.AS:
 *   AS.db (mock data service), AS.content (strings), AS.charts / AS.map (SVG generators), AS.ui (formatters, toast, export).
 * Files are copies of ../assets/js so the public site keeps its own untouched versions.
 * All admin screens are React components now; the legacy page modules are no longer loaded.
 */
import './data.js';
import './amrut.js';
import './charts.js';
import './map.js';
import './ui.js';

import type { LegacyGlobal } from '../types/legacy';

const AS: LegacyGlobal = window.AS;
AS.actions = AS.actions || {};
AS.state = AS.state || {};
export default AS;
