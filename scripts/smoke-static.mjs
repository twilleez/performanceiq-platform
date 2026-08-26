import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const assert = (name, condition, detail = '') => checks.push({ name, ok: Boolean(condition), detail });

const requiredFiles = [
  'index.html',
  'styles.css',
  'manifest.json',
  'sw.js',
  'js/app.js',
  'js/router.js',
  'js/core/auth.js',
  'js/core/boot.js',
  'js/core/supabase.js',
  'js/views/shared/signup.js',
  'js/views/shared/onboarding.js',
  'css/auth-hotfix.css',
  'css/onboarding-hotfix.css',
  '.github/workflows/deploy.yml',
];

for (const rel of requiredFiles) assert(`file exists: ${rel}`, fs.existsSync(path.join(root, rel)));

const index = read('index.html');
const router = read('js/router.js');
const auth = read('js/core/auth.js');
const boot = read('js/core/boot.js');
const signup = read('js/views/shared/signup.js');
const supabase = read('js/core/supabase.js');
const deploy = read('.github/workflows/deploy.yml');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));

const authHotfixAt = index.indexOf('css/auth-hotfix.css');
const onboardingHotfixAt = index.indexOf('css/onboarding-hotfix.css');
const legacyOnboardingAt = index.indexOf('css/onboarding.css');
assert('auth hotfix is loaded', authHotfixAt >= 0);
assert('onboarding hotfix is loaded', onboardingHotfixAt >= 0);
assert('onboarding hotfix loads after legacy onboarding CSS', onboardingHotfixAt > legacyOnboardingAt);
assert('auth hotfix loads before onboarding final override', onboardingHotfixAt > authHotfixAt);

for (const role of ['coach', 'player', 'parent', 'admin', 'solo']) {
  assert(`ROLE_HOME contains ${role}`, new RegExp(`\\b${role}\\s*:`).test(router));
}

assert('Supabase publishable key is used', supabase.includes('sb_publishable_'));
assert('service-role key is not shipped in browser client', !/service_role/i.test(supabase));
assert('production auth validates restored Supabase session', auth.includes('getSession') || auth.includes('restoreProductionSession'));
assert('boot reconciles authentication', /reconcil|restoreProductionSession|validate/i.test(boot));
assert('signup uses semantic form submit', signup.includes('id="su-form"') && signup.includes("addEventListener('submit'"));
assert('signup fields have accessible labels', signup.includes('for="su-name"') && signup.includes('for="su-email"') && signup.includes('for="su-pass"'));
assert('signup role controls expose pressed state', signup.includes('aria-pressed'));
assert('signup password has minimum length', /minlength=["']8["']/.test(signup));
assert('signup message is announced', signup.includes('aria-live="polite"'));

assert('root package has no legacy workspaces', !Object.hasOwn(pkg, 'workspaces'));
assert('root package test delegates to smoke checks', pkg.scripts?.test === 'npm run test:smoke');
assert('deployment stages a dedicated Pages directory', deploy.includes('mkdir -p .pages'));
assert('deployment does not upload entire repository', !/path:\s*['"]?\.['"]?\s*(?:#.*)?$/m.test(deploy));
assert('deployment excludes frontend from Pages artifact', deploy.includes('test ! -e .pages/frontend'));
assert('deployment excludes backend from Pages artifact', deploy.includes('test ! -e .pages/backend'));
assert('deployment runs smoke checks before upload', deploy.indexOf('npm run test:smoke') < deploy.indexOf('actions/upload-pages-artifact'));
assert('service worker uses registration scope', sw.includes('self.registration.scope'));
assert('service worker does not precache account-root index', !sw.includes("'/index.html'"));

const failed = checks.filter(c => !c.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}

console.log(`\n${checks.length - failed.length}/${checks.length} smoke checks passed.`);
if (failed.length) process.exit(1);
