const button = document.querySelector("#demoSubmit");
const result = document.querySelector("#demoResult");

button.addEventListener("click", () => {
  button.textContent = "✓ FLO received it";
  button.style.background = "#477f1f";

  result.textContent =
    "You're done for today. We’ll take it from here.";
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


/* FLO CONTACT FORM */

const floContactForm = document.querySelector("#floContactForm");
const floContactSubmit = document.querySelector("#floContactSubmit");
const floContactStatus = document.querySelector("#floContactStatus");
const floSmsConsent = document.querySelector("#floSmsConsent");

/* A failed reset must still restore the consent box to unchecked. */
if (floContactForm && floSmsConsent) {
  floContactForm.addEventListener("reset", () => {
    floSmsConsent.checked = false;
  });
}

if (floContactForm && floContactSubmit && floContactStatus) {
  floContactForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!floContactForm.reportValidity()) {
      return;
    }

    const formData = new FormData(floContactForm);

    const smsConsent = Boolean(floSmsConsent && floSmsConsent.checked);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      smsConsent,
      smsConsentVersion: "2026-09-24-r2"
    };

    floContactSubmit.disabled = true;
    floContactSubmit.firstChild.textContent = "Sending to FLO ";
    floContactStatus.className = "flo-form-status";
    floContactStatus.textContent = "Sending your message securely…";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Your message could not be sent.");
      }

      floContactForm.reset();
      floContactForm.dispatchEvent(new Event("reset"));
      floSmsConsent.checked = false;
      floContactStatus.className = "flo-form-status success";
      floContactStatus.textContent =
        "FLO received it. A person from OpenFootLab will follow up directly.";

      floContactSubmit.firstChild.textContent = "Received by FLO ";
    } catch (error) {
      floContactStatus.className = "flo-form-status error";
      floContactStatus.textContent =
        error.message ||
        "FLO could not send that message. Please email flo@footlabos.com.";
      floContactSubmit.firstChild.textContent = "Send to FLO ";
    } finally {
      floContactSubmit.disabled = false;
    }
  });
}
