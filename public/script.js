const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

const dateInput = document.getElementById("visitDate");
const today = new Date();
dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll("[data-dept]").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelector('select[name="department"]').value = link.dataset.dept;
  });
});

const form = document.getElementById("appointmentForm");
const status = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");
form.addEventListener("submit", async event => {
  event.preventDefault();
  status.textContent = "";
  status.className = "form-status";
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending request…";
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Please try again.");
    status.textContent = `${result.message} Reference: ${result.appointmentId}. Please call the clinic if you need urgent assistance.`;
    form.reset();
    dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  } catch (error) {
    status.textContent = error.message || "Could not send request. Please call +91 73584 95406.";
    status.classList.add("error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Send appointment request <span>→</span>';
  }
});