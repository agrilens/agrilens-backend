const { admin } = require("../config/firebase-config");

class Middleware {
  async decodeToken(req, res, next) {
    // console.log(">>>> req: ", req.headers.authorization);
    if (req.headers.authorization === undefined) return "Token NOT Provided";
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decodeValue = await admin.auth().verifyIdToken(token);

      if (decodeValue) {
        req.user = decodeValue;
        return next();
      }

      return res.status(403).json({ message: "Not Authorized" });
    } catch (error) {
      return res.status(500).json({
        message: `Auth Internal Error: ${error?.message}`, // Log the error message
        reason: `Auth Internal Error: Authorization Failed`, // Log the error message
      });
    }
  }
}

module.exports = new Middleware();
