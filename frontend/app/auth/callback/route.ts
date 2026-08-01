import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeRedirectUrl, getRedirectAfterLogin } from '@/lib/redirectUtils';

/**
 * Google OAuth Callback Route Handler
 * Exchanges OAuth authorization code for fresh session, extracts exact Google user metadata,
 * updates client localStorage and document.cookie via script bridge, and redirects safely.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectParam = searchParams.get('next') || searchParams.get('redirect') || '/chat';

  if (code) {
    try {
      const supabase = await createClient();
      
      // Exchange OAuth authorization code for session
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (!sessionError && sessionData?.user) {
        const freshUser = sessionData.user;
        const email = (freshUser.email || '').toLowerCase().trim();
        const fullName =
          freshUser.user_metadata?.full_name ||
          freshUser.user_metadata?.name ||
          (email.split('@')[0] || 'Google User').replace('.', ' ').toUpperCase();

        const userRole =
          freshUser.user_metadata?.role ||
          (email.includes('admin') ? 'admin' : email.includes('faculty') ? 'faculty' : 'student');

        const token = sessionData.session?.access_token || 'google-session-token';
        const destination = getRedirectAfterLogin(userRole, redirectParam);

        const userObj = {
          id: freshUser.id || 'usr-google-' + Date.now(),
          email: email,
          full_name: fullName,
          role: userRole,
        };

        // Render HTML response with inline JS script that purges old storage and sets current user
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Synchronizing CampusIQ Session...</title>
</head>
<body style="background:#090d16;color:#ffffff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;select:none;">
  <div style="text-align:center;background:#0f172a;padding:32px;border-radius:24px;border:1px solid #1e293b;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);max-width:360px;width:100%;">
    <div style="width:40px;height:40px;margin:0 auto 16px auto;border:3px solid #8b5cf6;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
    <div style="font-size:15px;font-weight:700;color:#f8fafc;margin-bottom:6px;">Authenticating Account</div>
    <div style="font-size:12px;color:#94a3b8;font-family:monospace;">${email}</div>
  </div>
  <style>
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  <script>
    try {
      localStorage.removeItem("campusiq_user");
      localStorage.removeItem("campusiq_token");
      sessionStorage.clear();
      localStorage.setItem("campusiq_user", JSON.stringify(${JSON.stringify(userObj)}));
      localStorage.setItem("campusiq_token", "${token}");
      document.cookie = "campusiq_token=${token}; path=/; max-age=86400; SameSite=Lax";
      document.cookie = "campusiq_role=${userRole}; path=/; max-age=86400; SameSite=Lax";
    } catch (e) {
      console.error("Storage sync error:", e);
    }
    window.location.href = "${origin}${destination}";
  </script>
</body>
</html>`;

        const response = new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        });

        response.cookies.set('campusiq_token', token, {
          path: '/',
          maxAge: 86400,
          sameSite: 'lax',
        });
        response.cookies.set('campusiq_role', userRole, {
          path: '/',
          maxAge: 86400,
          sameSite: 'lax',
        });

        return response;
      }
    } catch (err) {
      console.error('[OAuth Callback] Exception during session exchange:', err);
    }
  }

  // Fallback redirect if code exchange fails
  const fallbackDestination = normalizeRedirectUrl(redirectParam, '/chat');
  return NextResponse.redirect(`${origin}${fallbackDestination}`);
}
