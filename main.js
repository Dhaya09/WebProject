const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');
const generateOtpButton = document.getElementById('generateOtpButton');
const signUpSubmitButton = document.getElementById('signUpButton');
const otpField = document.getElementById('otpField');

container.style.display = 'none';

// Event listener for the login link
loginLink.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default anchor click behavior
    container.style.display = 'block'; // Show the container
    document.querySelector('.sign-in-container').style.display = 'block'; // Show sign-in container
    document.querySelector('.sign-up-container').style.display = 'block'; // Hide sign-up container
});

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
        const response = await fetch('/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        alert(data.message);

        // Enable OTP field for input after OTP is sent
        otpField.disabled = false;
    } catch (err) {
        alert("Error sending OTP. Please try again.");
    }
});

// Verify OTP on input change
otpField.addEventListener('input', async () => {
    const email = document.querySelector('#signupEmail').value;
    const otp = otpField.value;

    if (otp.length === 6) { // Assuming 6-digit OTP
        try {
            const response = await fetch('/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await response.json();

            if (data.message === "OTP verified successfully") {
                generateOtpButton.style.display = 'none'; // Hide Generate OTP button
                signUpSubmitButton.style.display = 'block'; // Show Sign Up button
                otpField.disabled = true; // Disable OTP field after verification
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
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (data.redirect) {
            window.location.href = data.redirect;
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error during signup. Please try again.");
    }
});

// Handle Login Form Submission (unchanged)
document.querySelector('.sign-in-container form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('.sign-in-container input[type="email"]').value;
    const password = document.querySelector('.sign-in-container input[type="password"]').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (data.redirect) {
            window.location.href = data.redirect;
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Error during login. Please try again.");
    }
});
