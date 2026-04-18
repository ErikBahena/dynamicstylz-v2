/* Dynamic Stylz Salon — interactions
   Kept intentionally small: mobile nav, year, scroll reveal. */

(() => {
  // ------- year in footer -------
  const yr = document.getElementById("year");
  if (yr) yr.textContent = String(new Date().getFullYear());

  // ------- mobile nav toggle -------
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.getElementById("mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      if (open) {
        menu.hidden = true;
        menu.removeAttribute("data-open");
      } else {
        menu.hidden = false;
        menu.setAttribute("data-open", "true");
      }
    });
    // close menu when a link is clicked
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        menu.hidden = true;
        menu.removeAttribute("data-open");
      })
    );
  }

  // ------- scroll reveal (progressive enhancement) -------
  const targets = [
    ".hero__content",
    ".hero__art",
    ".about__art",
    ".about__body",
    ".services__grid .card",
    ".experience__grid > div",
    ".reviews__featured .review-card",
    ".reviews__strip .review-card",
    ".visit__copy",
    ".visit__card",
    ".section__head",
  ];
  const els = document.querySelectorAll(targets.join(","));
  els.forEach((el, i) => {
    el.setAttribute("data-reveal", "");
    el.style.transitionDelay = Math.min(i * 40, 260) + "ms";
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach((el) => el.classList.add("is-in"));
  }
})();
