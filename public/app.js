(function () {
  "use strict";

  const loginView = document.getElementById("loginView");
  const appView = document.getElementById("appView");
  const loginError = document.getElementById("loginError");
  const signInBtn = document.getElementById("signInBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const userLabel = document.getElementById("userLabel");
  const platformGrid = document.getElementById("platformGrid");

  function showError(message) {
    loginError.textContent = message;
    loginError.style.display = "block";
  }

  function clearError() {
    loginError.style.display = "none";
  }

  function showApp() {
    loginView.classList.add("hidden");
    appView.classList.add("visible");
  }

  function showLogin() {
    loginView.classList.remove("hidden");
    appView.classList.remove("visible");
  }

  const tauri = window.__TAURI__;
  if (!tauri) {
    // The `desktop-app` Docker service (infra/docker-compose.platform.yml,
    // "Web Client Preview") loads this same page in a plain browser tab for
    // parity with the other nine platforms' dev-preview URLs — it never has
    // `window.__TAURI__`, since that only exists inside the native shell
    // built from src-tauri/. OIDC + keychain login is a native-only feature;
    // fail visibly here rather than throwing on the first click.
    signInBtn.disabled = true;
    signInBtn.textContent = "Sign-in requires the native UniERP Desktop app";
    showError(
      "This is a browser preview of the desktop shell. Run the native app " +
        "(`pnpm tauri:dev` in desktop-app) to sign in.",
    );
    return;
  }

  const invoke = tauri.core.invoke;
  const openUrl = tauri.opener.openUrl;
  const listen = tauri.event.listen;

  async function persistTokens(tokens) {
    await invoke("keychain_set", { key: "access_token", value: tokens.access_token });
    if (tokens.refresh_token) {
      await invoke("keychain_set", { key: "refresh_token", value: tokens.refresh_token });
    }
  }

  async function clearTokens() {
    await invoke("keychain_delete", { key: "access_token" });
    await invoke("keychain_delete", { key: "refresh_token" });
  }

  async function loadPlatforms(accessToken) {
    const [userinfo, platforms] = await Promise.all([
      window.UniErpOidc.fetchUserinfo(accessToken),
      window.UniErpOidc.fetchEntitledPlatforms(accessToken),
    ]);

    userLabel.textContent = userinfo.email || "";
    platformGrid.innerHTML = "";

    if (platforms.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No platforms are entitled to this account yet.";
      platformGrid.appendChild(empty);
      return;
    }

    for (const platform of platforms) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `<div class="name">${platform.name}</div><div class="code">${platform.code} · :${platform.port}</div>`;
      // Opened in the SYSTEM browser, not this webview — that's the same
      // browser the OIDC sign-in just ran in, so it already holds the SSO
      // session and lands the user straight in, no second login.
      tile.addEventListener("click", () => {
        openUrl(platform.baseUrl || `http://localhost:${platform.port}`);
      });
      platformGrid.appendChild(tile);
    }
    showApp();
  }

  async function tryRestoreSession() {
    const accessToken = await invoke("keychain_get", { key: "access_token" });
    if (!accessToken) return;
    try {
      await loadPlatforms(accessToken);
    } catch {
      // Access token likely expired — try the refresh token before giving up.
      const refreshToken = await invoke("keychain_get", { key: "refresh_token" });
      if (!refreshToken) return;
      const renewed = await window.UniErpOidc.refreshToken(refreshToken);
      if (!renewed) {
        await clearTokens();
        return;
      }
      await persistTokens(renewed);
      await loadPlatforms(renewed.access_token);
    }
  }

  signInBtn.addEventListener("click", async () => {
    clearError();
    signInBtn.disabled = true;
    signInBtn.textContent = "Waiting for browser sign-in…";
    try {
      const url = await window.UniErpOidc.buildAuthorizeUrl();
      await openUrl(url);
    } catch (error) {
      showError(error.message || "Could not start sign-in.");
      signInBtn.disabled = false;
      signInBtn.textContent = "Sign in with UniERP Account";
    }
  });

  signOutBtn.addEventListener("click", async () => {
    await clearTokens();
    showLogin();
    signInBtn.disabled = false;
    signInBtn.textContent = "Sign in with UniERP Account";
  });

  // The Rust side (src-tauri/src/lib.rs) catches `unierp://auth/callback`
  // via the OS's registered-scheme mechanism and re-emits it here as a plain
  // string event — this window never navigates to the redirect URI itself.
  listen("oidc-callback", async (event) => {
    clearError();
    try {
      const tokens = await window.UniErpOidc.exchangeCode(event.payload);
      await persistTokens(tokens);
      await loadPlatforms(tokens.access_token);
    } catch (error) {
      showError(error.message || "Sign-in failed.");
    } finally {
      signInBtn.disabled = false;
      signInBtn.textContent = "Sign in with UniERP Account";
    }
  });

  tryRestoreSession();
})();
