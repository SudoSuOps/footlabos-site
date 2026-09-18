const button = document.querySelector("#demoSubmit");
const result = document.querySelector("#demoResult");

button.addEventListener("click", () => {
  button.textContent = "✓ Check received";
  button.style.background = "#477f1f";

  result.textContent =
    "You're done for today. FootLabOS takes it from here.";
});
