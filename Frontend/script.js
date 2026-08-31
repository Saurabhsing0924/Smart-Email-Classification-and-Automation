const apiRoot = "http://localhost:5000";

async function post(path, payload) {
  const res = await fetch(`${apiRoot}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function showResult(text) {
  document.getElementById("result").innerText = text;
}

async function loadSettings() {
  try {
    const res = await fetch(`${apiRoot}/settings`);
    const settings = await res.json();
    document.getElementById("forward-to").value = settings.forward_to || "";
  } catch (error) {
    console.warn("Unable to load settings", error);
  }
}

document.getElementById("process-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const subject = document.getElementById("subject").value;
  const body = document.getElementById("body").value;

  const data = await post("/process-email", { subject, body });
  showResult(`Labels: ${data.labels.join(", ")}\nResponse: ${data.auto_response}`);
});

document.getElementById("label-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgId = document.getElementById("msg-id").value;
  const label = document.getElementById("label").value;

  const data = await post("/apply-label", { msg_id: msgId, label });
  showResult(data.success ? `Label added: ${data.label}` : `Error: ${data.error}`);
});

document.getElementById("forward-settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const forwardTo = document.getElementById("forward-to").value;

  const data = await post("/set-forward", { forward_to: forwardTo });
  showResult(data.success ? `Forward address saved: ${data.forward_to}` : `Error: ${data.error}`);
});

document.getElementById("forward-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgId = document.getElementById("forward-msg-id").value;
  const forwardTo = document.getElementById("forward-to").value;

  const data = await post("/forward-message", { msg_id: msgId, forward_to: forwardTo });
  showResult(data.success ? `Message forwarded to ${data.forward_to}` : `Error: ${data.error}`);
});

loadSettings();