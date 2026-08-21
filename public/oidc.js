// OIDC authorization-code + PKCE against idp, for the desktop shell.
//
// Mirrors unierp-mobile's OidcAuthDataSource (lib/features/auth/data/
// datasources/oidc_auth_datasource.dart) and the seeded client in
// data/prisma/seed-oidc-clients.ts: `unierp-desktop` is a public PKCE-only
// client, redirecting to `unierp://auth/callback`.
(function (global) {
  "use strict";

  const IDP_ORIGIN = window.UNIERP_IDP_ORIGIN || "http://localhost:3005";
  const API_ORIGIN = window.UNIERP_API_ORIGIN || "http://localhost:3001";
  const CLIENT_ID = "unierp-desktop";
  const REDIRECT_URI = "unierp://auth/callback";
  const SCOPES = ["openid", "profile", "email", "tenant", "offline_access", "erp.read", "erp.write"];

  function base64UrlEncode(bytes) {
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function randomString(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
  }

  async function sha256Base64Url(input) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(digest));
  }

  /**
   * Builds the /oidc/authorize URL and remembers the PKCE verifier + state
   * in sessionStorage — this webview instance is what will receive the
   * `oidc-callback` event (via the deep-link plugin), so it's also the one
   * that needs the verifier to complete the exchange.
   */
  async function buildAuthorizeUrl() {
    const codeVerifier = randomString(64);
    const state = randomString(24);
    const codeChallenge = await sha256Base64Url(codeVerifier);

    sessionStorage.setItem("unierp.pkce_verifier", codeVerifier);
    sessionStorage.setItem("unierp.oidc_state", state);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `${IDP_ORIGIN}/oidc/authorize?${params.toString()}`;
  }

  /**
   * Completes the exchange once the deep-link callback delivers `code` and
   * `state`. Throws on a state mismatch — the CSRF defence for a flow that
   * round-trips through the OS rather than a single origin.
   */
  async function exchangeCode(callbackUrl) {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      throw new Error(url.searchParams.get("error_description") || error);
    }

    const expectedState = sessionStorage.getItem("unierp.oidc_state");
    const codeVerifier = sessionStorage.getItem("unierp.pkce_verifier");
    sessionStorage.removeItem("unierp.oidc_state");
    sessionStorage.removeItem("unierp.pkce_verifier");

    if (!code || !state || !codeVerifier || state !== expectedState) {
      throw new Error("Sign-in could not be verified. Please try again.");
    }

    const res = await fetch(`${IDP_ORIGIN}/oidc/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error_description || body.message || "Sign-in failed.");
    }
    return res.json(); // { access_token, refresh_token, id_token, expires_in, ... }
  }

  async function refreshToken(token) {
    const res = await fetch(`${IDP_ORIGIN}/oidc/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token,
        client_id: CLIENT_ID,
      }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function fetchEntitledPlatforms(accessToken) {
    const res = await fetch(`${IDP_ORIGIN}/api/v1/auth/platforms`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Could not load your platforms.");
    const body = await res.json();
    return body.platforms || [];
  }

  async function fetchUserinfo(accessToken) {
    const res = await fetch(`${IDP_ORIGIN}/oidc/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Could not load your profile.");
    return res.json();
  }

  global.UniErpOidc = {
    API_ORIGIN,
    buildAuthorizeUrl,
    exchangeCode,
    refreshToken,
    fetchEntitledPlatforms,
    fetchUserinfo,
  };
})(window);
