async function pollUntilComplete(predictionUrl, replicateToken, interval = 3000) {
    const axios = require("axios");
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const res = await axios.get(predictionUrl, {
            headers: {
              Authorization: `Token ${replicateToken}`
            }
          });
  
          const status = res.data.status;
          if (status === "succeeded") {
            resolve(res.data.output); // array of image URLs
          } else if (status === "failed") {
            reject("Prediction failed: " + res.data.error);
          } else {
            setTimeout(poll, interval); // poll again
          }
        } catch (err) {
          reject(err.message);
        }
      };
  
      poll();
    });
  }

const axios = require("axios");
const fs = require("fs");

const replicateToken = process.env.REPLICATE_API_TOKEN || "your-replicate-api-token-here";
const inputImage = fs.readFileSync("./images/person.jpeg");

async function runPlayground() {
  const data = {
    version: "cb3870529e288f5826b9f2260b50c7b3d7349f327b763de7db8cbf4e9c085c34",
    input: {
      image: "data:image/jpeg;base64," + inputImage.toString("base64"),
      prompt: "realistic cinematic portrait of a man in soft light",
      guidance_scale: 7,
      num_inference_steps: 30,
      scheduler: "K_EULER"
    }
  };

  const res = await axios.post("https://api.replicate.com/v1/predictions", data, {
    headers: {
      Authorization: `Token ${replicateToken}`,
      "Content-Type": "application/json"
    }
  });

  const predictionUrl = res.data.urls.get;
  const result = await pollUntilComplete(predictionUrl, replicateToken);
  console.log("✅ Playground Output Image URL:", result);
}

runPlayground();
