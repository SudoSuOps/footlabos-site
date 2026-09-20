const FROM_EMAIL = "FLO at FootLabOS <flo@footlabos.com>";
const TO_EMAIL = "flo@openfootlab.com";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function clean(value, maxLength) {
  return String(value ?? "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendEmail(apiKey, payload) {
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!result.ok) {
    const detail = await result.text();
    throw new Error(`Resend returned ${result.status}: ${detail}`);
  }

  return result.json();
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return response({ error: "Method not allowed." }, 405);
  }

  if (!env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured.");
    return response(
      { error: "The contact service is temporarily unavailable." },
      503
    );
  }

  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return response({ error: "Invalid request format." }, 415);
  }

  let raw;

  try {
    raw = await request.text();
  } catch {
    return response({ error: "Unable to read the request." }, 400);
  }

  if (raw.length > 12000) {
    return response({ error: "The request is too large." }, 413);
  }

  let body;

  try {
    body = JSON.parse(raw);
  } catch {
    return response({ error: "Invalid request." }, 400);
  }

  // Quietly accept obvious bot submissions.
  if (clean(body.website, 200)) {
    return response({ ok: true });
  }

  const name = clean(body.name, 80);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 30);
  const message = clean(body.message, 1000);

  if (name.length < 2) {
    return response({ error: "Please enter your name." }, 400);
  }

  if (!validEmail(email)) {
    return response({ error: "Please enter a valid email address." }, 400);
  }

  const phoneDigits = phone.replace(/\D/g, "");

  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return response({ error: "Please enter a valid phone number." }, 400);
  }

  if (message.length < 10) {
    return response({ error: "Please include a brief message." }, 400);
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const receivedAt = new Date().toISOString();

  try {
    // The lead notification is the essential delivery.
    await sendEmail(env.RESEND_API_KEY, {
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      reply_to: email,
      subject: `New FLO conversation — ${name}`,
      text:
`A new FootLabOS conversation was received.

Name: ${name}
Email: ${email}
Phone: ${phone}
Received: ${receivedAt}

Message:
${message}

Reply directly to this email to contact the client.`,
      html:
`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#172025">
  <div style="background:#101417;padding:22px;border-radius:16px 16px 0 0">
    <strong style="display:inline-block;background:#b7ff67;color:#091006;padding:10px 12px;border-radius:10px">FLO</strong>
    <span style="color:#ffffff;font-weight:700;margin-left:12px">New FootLabOS conversation</span>
  </div>
  <div style="border:1px solid #d9dfe2;padding:24px;border-radius:0 0 16px 16px">
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Email:</strong> ${safeEmail}</p>
    <p><strong>Phone:</strong> ${safePhone}</p>
    <p><strong>Received:</strong> ${receivedAt}</p>
    <hr style="border:0;border-top:1px solid #d9dfe2;margin:22px 0">
    <p><strong>Brief message</strong></p>
    <p style="line-height:1.6">${safeMessage}</p>
    <p style="color:#647078;font-size:12px;margin-top:24px">
      Reply directly to this email to contact the client.
    </p>
  </div>
</div>`
    });
  } catch (error) {
    console.error("FLO lead delivery failed:", error);
    return response(
      {
        error:
          "FLO could not send your message. Please email flo@openfootlab.com."
      },
      502
    );
  }

  // A failed acknowledgment must not cause the client to resubmit
  // a lead that OpenFootLab already received.
  try {
    await sendEmail(env.RESEND_API_KEY, {
      from: FROM_EMAIL,
      to: [email],
      reply_to: TO_EMAIL,
      subject: "FLO received your message",
      text:
`FLO received it.

Thanks, ${name}. Your message reached the OpenFootLab team. A person will follow up with you directly about the 15-Day FLO Profile Builder.

No credit card is required. There is no automatic billing.

Please do not send medical records, foot photos or urgent concerns by regular email. We will provide a secure next step when appropriate.

— FLO at FootLabOS
flo@openfootlab.com
Jupiter, FL · By appointment
561.532.7120`,
      html:
`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172025">
  <div style="background:#101417;padding:24px;border-radius:16px 16px 0 0">
    <strong style="display:inline-block;background:#b7ff67;color:#091006;padding:11px 13px;border-radius:10px">FLO</strong>
  </div>
  <div style="border:1px solid #d9dfe2;padding:28px;border-radius:0 0 16px 16px">
    <h1 style="font-size:28px;margin:0 0 18px">FLO received it.</h1>
    <p style="line-height:1.65">Thanks, ${safeName}. Your message reached the OpenFootLab team. A person will follow up with you directly about the 15-Day FLO Profile Builder.</p>
    <p style="line-height:1.65"><strong>No credit card is required. There is no automatic billing.</strong></p>
    <p style="color:#647078;font-size:13px;line-height:1.55;margin-top:24px">
      Please do not send medical records, foot photos or urgent concerns by regular email. We will provide a secure next step when appropriate.
    </p>
    <p style="margin-top:26px"><strong>— FLO at FootLabOS</strong><br>
      <a href="mailto:flo@openfootlab.com">flo@openfootlab.com</a><br>
      Jupiter, FL · By appointment<br>
      561.532.7120
    </p>
  </div>
</div>`
    });
  } catch (error) {
    console.error("FLO acknowledgment failed:", error);
  }

  return response({ ok: true });
}
