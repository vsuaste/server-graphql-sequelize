const NodeMailer = require('nodemailer');
const SmtpTransport = require('nodemailer-smtp-transport');
const Globals = require('../config/globals');
const path = require('path');

module.exports = {
    sendEmail: function (dst_email, subj, message, att){
        console.log(`${dst_email}, ${message}, ${Globals.MAIL_ACCOUNT}, ${Globals.MAIL_PASSWORD}`);

        let transporter = NodeMailer.createTransport(SmtpTransport({
            service: Globals.MAIL_SERVICE,
            host: Globals.MAIL_HOST,
            auth: {
                type: "login",
                user: Globals.MAIL_ACCOUNT,
                pass: Globals.MAIL_PASSWORD
            }
        }));

        let mailOptions = {
            from: Globals.MAIL_ACCOUNT,
            to: dst_email,
            subject: subj,
            text: message,
            attachments: att
        };


        return transporter.sendMail(mailOptions);
    }
};