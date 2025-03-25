const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () =>
    container.classList.add('right-panel-active'));

signInButton.addEventListener('click', () =>
    container.classList.remove('right-panel-active'));



document.addEventListener("DOMContentLoaded", function () {
    // Handle Sign-Up Form Submission
    document.querySelector(".sign-up-container form").addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = this.querySelector('input[type="text"]').value.trim();
        const email = this.querySelector('input[type="email"]').value.trim();
        const password = this.querySelector('input[type="password"]').value.trim();
        const confirmPassword = this.querySelector('input[name="confirmPassword"]').value.trim();

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            if (response.ok) {
                alert("Signup successful! Redirecting...");
                window.location.href = data.redirect;
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("Error during signup:", error);
            alert("Signup failed. Please try again.");
        }
    });

    // Handle Sign-In Form Submission
    document.querySelector(".sign-in-container form").addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = this.querySelector('input[type="email"]').value.trim();
        const password = this.querySelector('input[type="password"]').value.trim();

        try {
            const response = await fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                alert("Login successful! Redirecting...");
                localStorage.setItem("token", data.token);
                window.location.href = data.redirect;
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("Error during login:", error);
            alert("Login failed. Please try again.");
        }
    });
});
