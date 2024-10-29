const { admin } = require("../config/firebase-config");

class Middleware {
  async decodeToken(req, res, next) {
    // console.log(">>>> req: ", req.headers.authorization);

    try {
      const token = req.headers.authorization.split(" ")[1];
      const decodeValue = await admin.auth().verifyIdToken(token);
      //   console.log('decodeValue: ', decodeValue);

      if (decodeValue) {
        req.user = decodeValue;
        return next();
      }

      return res.json({ message: "Not Authorized" });
    } catch (error) {
      return res.json({
        message: `Auth Internal Error: ${error?.message}`,
      });
    }
  }
}

module.exports = new Middleware();
