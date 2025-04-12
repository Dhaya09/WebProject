const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');
const generateOtpButton = document.getElementById('generateOtpButton');
const signUpSubmitButton = document.getElementById('signUpButton');
const otpField = document.getElementById('otpField');
const loginLink = document.getElementById('loginLink');

// Initially hide container
container.style.display = 'none';

// Event listener for the login link
loginLink.addEventListener('click', (event) => {
    event.preventDefault();
    container.style.display = 'block';
    document.querySelector('.sign-in-container').style.display = 'block';
    document.querySelector('.sign-up-container').style.display = 'block';
});

// Toggle between sign-up and sign-in
signUpButton.addEventListener('click', () => {
    container.classList.add('right-panel-active');
});

signInButton.addEventListener('click', () => {
    container.classList.remove('right-panel-active');
});

// Handle Generate OTP Button
generateOtpButton.addEventListener('click', async () => {
    const email = document.querySelector('#signupEmail').value;

    try {
        const response = await fetch('http://localhost:5000/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            credentials: 'include'
        });
        const data = await response.json();
        alert(data.message);
        if (data.message === "OTP sent to your email") {
            otpField.disabled = false;
        }
    } catch (err) {
        alert("Error sending OTP. Please try again.");
    }
});

// Verify OTP on input change
otpField.addEventListener('input', async () => {
    const email = document.querySelector('#signupEmail').value;
    const otp = otpField.value;

    if (otp.length === 6) {
        try {
            const response = await fetch('http://localhost:5000/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
                credentials: 'include'
            });
            const data = await response.json();

            if (data.message === "OTP verified successfully") {
                generateOtpButton.style.display = 'none';
                signUpSubmitButton.style.display = 'block';
                otpField.disabled = true;
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert("Error verifying OTP. Please try again.");
        }
    }
});

// Handle Signup Form Submission
document.querySelector('.sign-up-container form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.querySelector('.sign-up-container input[type="text"]').value;
    const email = document.querySelector('.sign-up-container input[type="email"]').value;
    const password = document.querySelector('.sign-up-container input[type="password"]').value;

    try {
        const response = await fetch('http://localhost:5000/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
            credentials: 'include'
        });
        const data = await response.json();
        if (data.message === "Signup successful" && data.token) {
            localStorage.setItem("token", data.token);
            alert("Signup successful! Please log in.");
            container.classList.remove('right-panel-active');
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error during signup. Please try again.");
    }
});

// Handle Login Form Submission
document.querySelector('.sign-in-container form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('.sign-in-container input[type="email"]').value;
    const password = document.querySelector('.sign-in-container input[type="password"]').value;

    try {
        const response = await fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        const data = await response.json();
        if (data.message === "Login successful" && data.token) {
            localStorage.setItem("token", data.token);
            window.location.href = "http://localhost:5000/dashboard.html";
            console.log("Login successful - Token stored:", data.token); // Debug token
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error during login. Please try again.");
        console.error("Login error:", err);
    }
});