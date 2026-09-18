const button = document.querySelector("#demoSubmit");
const result = document.querySelector("#demoResult");

button.addEventListener("click", () => {
  button.textContent = "✓ Check received";
  button.style.background = "#477f1f";

  result.textContent =
    "You're done for today. FootLabOS takes it from here.";
});


/* FootLabOS V02 — lightweight local-only interaction */

const revealTargets = document.querySelectorAll(
  ".section, .impact-strip, .statement"
);

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.08
  }
);

revealTargets.forEach(el => {
  el.classList.add("reveal");
  observer.observe(el);
});
