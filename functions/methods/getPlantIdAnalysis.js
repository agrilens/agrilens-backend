const axios = require("axios");

const getPlantIdAnalysis = async (imageData, insights) => {
  console.log(">>> getPlantIdAnalysis() called.");

  // Construct the request payload
  let data = JSON.stringify({
    images: [imageData],
    latitude: 49.207, // Default values
    longitude: 16.608,
  });

  // TODO
  let requestType = insights.identification
    ? "identification"
    : "health_assessment";

  // Initial POST request config
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://plant.id/api/v3/identification", // TODO
    headers: {
      "Api-Key": process.env.PLANT_ID_API_KEY,
      "Content-Type": "application/json",
    },
    data: data,
  };

  let apiResponse = "";

  try {
    // POST request to PlantID
    const postResponse = await axios(config);
    const access_token = postResponse.data.access_token;

    // config for PlantId GET request
    config.method = "get";
    config.url = `https://plant.id/api/v3/identification/${access_token}?details=common_names,url,description,taxonomy,rank,gbif_id,inaturalist_id,image,synonyms,edible_parts,watering&language=en`;
    config.data = null; // Clear out data as it is not needed for GET

    // GET request to retrieve analysis result
    const getResponse = await axios(config);
    apiResponse = getResponse.data;
  } catch (error) {
    console.log("An error occurred during request to PlantID API");
    console.error(error);
    return {
      error: "An error occurred during request to PlantID API",
      details: error.message,
    };
  }

  // const result = apiResponse.result.classification;
  // return result;

  // Extract and filter the first suggestion
  const firstSuggestion = apiResponse.result.classification.suggestions[0];
  if (!firstSuggestion) {
    return { error: "No suggestions found." };
  }

  const filteredResult = {
    name: firstSuggestion.name,
    probability: firstSuggestion.probability,
    details: {
      common_names: firstSuggestion.details.common_names,
      description: {
        value: firstSuggestion.details.description.value,
        citation: firstSuggestion.details.description.citation,
      },
    },
  };

  return filteredResult;
};

module.exports = getPlantIdAnalysis;
