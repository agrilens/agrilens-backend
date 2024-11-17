const axios = require("axios");

const getAnalysis = async (apiUrl, modelSpec, headers) => {
  console.log(">>> getAalyzes() called.", modelSpec.model);
  const apiResponse = await axios.post(apiUrl, modelSpec, {
    headers: headers,
  });
  let analysisResult = apiResponse.data.choices[0].message.content;
  try {
    if (analysisResult.startsWith("```json")) {
      const cleanedResult = analysisResult
        .replace(/^```json/, "")
        .replace(/```$/, "");
      const analysisObject = JSON.parse(cleanedResult);
      analysisResult = analysisObject;
    } else if (analysisResult.trim().startsWith("{")) {
      const analysisObject = JSON.parse(analysisResult);
      analysisResult = analysisObject;
    } else {
      console.error("String format not recognized. No need to parse.");
    }
  } catch (error) {
    console.error("Failed to parse JSON string:", error);
  }

  return analysisResult;
};

module.exports = getAnalysis;
