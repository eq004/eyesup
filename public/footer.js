/* The site footer, one copy for every page: drop <div id="siteFooter"></div> (class "slim" for the one-line version)
   and include this script. Links point at the plain-English pages /help, /features, /pricing, /faq, /privacy, /terms, /contact. */
(() => {
  const host = document.getElementById("siteFooter");
  if (!host) return;
  const links = [["/help", "Help & setup"], ["/features", "Features"], ["/pricing", "Pricing"], ["/faq", "FAQ"], ["/privacy", "Privacy"], ["/terms", "Terms"], ["/contact", "Contact"]];
  const here = location.pathname.replace(/\/$/, "") || "/";
  host.innerHTML = `<footer class="site-foot ${host.classList.contains("slim") ? "slim" : ""}">
    <span class="site-foot-brand">© ${new Date().getFullYear()} Eyes Up · made by <a href="https://peakyou.com.au" target="_blank" rel="noopener">PeakYou</a> · Australia</span>
    <nav class="site-foot-links" aria-label="Site">${links.map(([href, label]) => `<a href="${href}" ${here === href ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
  </footer>`;
})();
