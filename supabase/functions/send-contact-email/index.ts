<!-- Load reCAPTCHA v3 -->
<script src="https://www.google.com/recaptcha/api.js?render=6Ld24dgrAAAAAERzEI8bTqLZ_9wqTJzcPrMyLuQw"></script>

<form id="contactForm">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Your Email" required />
  <input type="text" name="subject" placeholder="Subject" required />
  <textarea name="message" placeholder="Your Message" required></textarea>
  <button type="submit">Send</button>
</form>

<div id="formMessage" style="margin-top:10px;"></div>

<script>
document.getElementById("contactForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const form = e.target;
  const msgBox = document.getElementById("formMessage");

  grecaptcha.ready(function () {
    grecaptcha.execute("6Ld24dgrAAAAAERzEI8bTqLZ_9wqTJzcPrMyLuQw", { action: "submit" })
      .then(function (token) {
        const formData = {
          name: form.name.value,
          email: form.email.value,
          subject: form.subject.value,
          message: form.message.value,
          recaptchaToken: token,
        };

        fetch("/api/send-contact-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              msgBox.innerHTML = "<p style='color:green'>✅ Message sent successfully!</p>";
              form.reset();
            } else {
              msgBox.innerHTML = "<p style='color:red'>⚠️ " + (data.error || "Something went wrong.") + "</p>";
            }
          })
          .catch(err => {
            msgBox.innerHTML = "<p style='color:red'>❌ Network error: " + err.message + "</p>";
          });
      });
  });
});
</script>
