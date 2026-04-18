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

  // ------- live hours from Google Places (via /api/hours) -------
  // Falls back silently to the static <li> rows already in the page.
  const hoursList = document.querySelector("ul.hours[data-live-hours]");
  if (hoursList && "fetch" in window) {
    fetch("/api/hours")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.source !== "google") return;
        const groups = groupHours(parseWeekdayDescriptions(data.weekdayDescriptions));
        if (!groups.length) return;
        hoursList.innerHTML = groups
          .map(
            (g) =>
              `<li><span>${g.label}</span><span>${g.display}</span></li>`
          )
          .join("");
        const badge = document.querySelector("[data-hours-source]");
        if (badge) {
          badge.hidden = false;
          if (typeof data.openNow === "boolean") {
            badge.dataset.openNow = String(data.openNow);
            badge.textContent = data.openNow
              ? "Open now · synced from Google"
              : "Closed now · synced from Google";
          }
        }
      })
      .catch(() => {
        /* keep static fallback silently */
      });
  }

  // Parse Google's "Monday: 10:00 AM – 5:00 PM" strings into rows.
  function parseWeekdayDescriptions(desc) {
    if (!Array.isArray(desc)) return [];
    const short = {
      Monday: "Mon",
      Tuesday: "Tue",
      Wednesday: "Wed",
      Thursday: "Thu",
      Friday: "Fri",
      Saturday: "Sat",
      Sunday: "Sun",
    };
    const rows = [];
    for (const raw of desc) {
      const idx = raw.indexOf(":");
      if (idx < 0) continue;
      const day = raw.slice(0, idx).trim();
      const rest = raw.slice(idx + 1).trim();
      rows.push({
        day,
        short: short[day] || day.slice(0, 3),
        display: tidyTimes(rest),
      });
    }
    return rows;
  }

  // "10:00 AM – 5:00 PM" -> "10:00 – 5:00" (drop AM/PM to match site style).
  function tidyTimes(s) {
    if (/closed/i.test(s)) return "Closed";
    return s
      .replace(/\s*(AM|PM)/gi, "")
      .replace(/\u2009|\u202f/g, " ")
      .replace(/\s*[–—-]\s*/g, " – ")
      .trim();
  }

  // Collapse consecutive days with identical hours into ranges:
  // [Mon 10–5, Tue 10–5, Wed 10–5, Thu 10–5, Fri 10–4, Sat Closed, Sun Closed]
  // -> [{label: "Mon – Thu", display: "10:00 – 5:00"}, ...]
  function groupHours(rows) {
    const groups = [];
    for (const r of rows) {
      const last = groups[groups.length - 1];
      if (last && last.display === r.display) {
        last.endShort = r.short;
      } else {
        groups.push({ startShort: r.short, endShort: r.short, display: r.display });
      }
    }
    return groups.map((g) => ({
      label: g.startShort === g.endShort ? g.startShort : `${g.startShort} – ${g.endShort}`,
      display: g.display,
    }));
  }
})();
