import { normalizeRedirectUrl, buildLoginRedirectUrl } from './redirectUtils';

/**
 * Automated Verification Suite for Redirect Loop Protection
 */
export function runRedirectTests() {
  const tests = [
    {
      name: '1. Prevents recursive redirect parameters (/chat?redirect=/chat?redirect=/chat)',
      input: '/chat?redirect=/chat?redirect=/chat',
      expected: '/chat',
    },
    {
      name: '2. Normalizes URI-encoded recursive redirect (%2Fchat%3Fredirect%3D%2Fchat)',
      input: '%2Fchat%3Fredirect%3D%2Fchat',
      expected: '/chat',
    },
    {
      name: '3. Rejects redirecting back to auth pages (/login)',
      input: '/login',
      expected: '/chat',
    },
    {
      name: '4. Rejects open redirect external URLs (https://malicious-site.com)',
      input: 'https://malicious-site.com',
      expected: '/chat',
    },
    {
      name: '5. Preserves valid deep links (/dashboard?tab=analytics)',
      input: '/dashboard?tab=analytics',
      expected: '/dashboard?tab=analytics',
    },
    {
      name: '6. Preserves valid role routes (/admin)',
      input: '/admin',
      expected: '/admin',
    },
    {
      name: '7. buildLoginRedirectUrl creates clean login URL',
      input: '/settings',
      expected: '/login?redirect=%2Fsettings',
      isBuildTest: true,
    },
  ];

  let passed = 0;
  console.log('====================================================');
  console.log(' CampusIQ Redirect Protection Automated Test Suite');
  console.log('====================================================');

  tests.forEach((t) => {
    const result = t.isBuildTest ? buildLoginRedirectUrl(t.input) : normalizeRedirectUrl(t.input);
    const success = result === t.expected;
    if (success) passed++;
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${t.name}`);
    if (!success) {
      console.log(`       Got: "${result}", Expected: "${t.expected}"`);
    }
  });

  console.log('====================================================');
  console.log(` Results: ${passed}/${tests.length} tests passed.`);
  console.log('====================================================');
  return passed === tests.length;
}

if (require.main === module) {
  runRedirectTests();
}
