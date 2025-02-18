# Code Citations

## License: unknown
https://github.com/uaegean-i4mLab/palaemon-registration/tree/10ee441a75eb63fb713fb00b19296d56997bb8db/services/mailService.js

```javascript
transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

