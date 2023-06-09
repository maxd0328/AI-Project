document.addEventListener('DOMContentLoaded', (event) => {
    const form = document.querySelector('.two-column-form');

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        const termsCheckbox = document.getElementById('terms');
        const privacyCheckbox = document.getElementById('privacy');

        if (!validateEmail(email)) {
            alert('Invalid email format');
            return false;
        }

        if (!validatePhoneNumber(phoneNumber)) {
            alert('Phone number should only contain digits');
            return false;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return false;
        }

        // Check if the terms of service and privacy policy checkboxes are checked
        if (!termsCheckbox.checked) {
            alert('Please agree to the terms of service');
            return false;
        }

        if (!privacyCheckbox.checked) {
            alert('Please agree to the privacy policy');
            return false;
        }

        this.submit();
    });
});

function validateEmail(email) {
    // This is a very basic email validation. We should probably do more.
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
}

function validatePhoneNumber(phoneNumber) {
    const re = /^\+?\d+$/;
    return re.test(phoneNumber);
}