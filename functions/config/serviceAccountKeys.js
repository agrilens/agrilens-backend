require("dotenv").config();

const serviceAccountObj = {
  type: process.env.TYPE_VALUE,
  project_id: process.env.PROJECT_ID_VALUE,
  private_key_id: process.env.PRIVATE_KEY_ID_VALUE,
  private_key: process.env.PRIVATE_KEY_VALUE,
  client_email: process.env.CLIENT_EMAIL_VALUE,
  client_id: process.env.CLIENT_ID_VALUE,
  auth_uri: process.env.AUTH_URI_VALUE,
  token_uri: process.env.TOKEN_URI_VALUE,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_CERT_URL_VALUE,
  client_x509_cert_url: process.env.CLIENT_CERT_URL_VALUE,
  universe_domain: process.env.UNIVERSE_DOMAIN_VALUE,
};

module.exports = serviceAccountObj;

// project_bucket_name: process.env.PROJECT_BUCKET_NAME,