module.exports = {
  LIMIT_RECORDS : process.env.LIMIT_RECORDS || 10000,
  PORT : process.env.PORT || 3000,
  ALLOW_ORIGIN: process.env.ALLOW_ORIGIN || "http://localhost:8080",
  REQUIRE_SIGN_IN: process.env.REQUIRE_SIGN_IN || "true",
  MAX_TIME_OUT: process.env.MAX_TIME_OUT || 2000,
  MAIL_SERVICE: "gmail",
  MAIL_HOST: "smtp.gmail.com",
  MAIL_ACCOUNT: "sci.db.service@gmail.com",
  MAIL_PASSWORD: "SciDbServiceQAZ"
}
