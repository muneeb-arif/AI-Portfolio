const axios = require("axios");
const fs = require("fs");
const replicateToken = process.env.REPLICATE_API_TOKEN || "your-replicate-api-token-here";

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

  
async function runRealisticVision() {
    const inputImage = fs.readFileSync("./images/person.jpeg");
    const data = {
      version: "f5e6942cb3f10707c93800dcfe7aa1abebdc3b6769c7ab30781818e2b64e5e36",
      input: {
        image: "data:image/jpeg;base64," + inputImage.toString("base64"),
        prompt: "photorealistic lake and pine forest, golden hour, Sony Alpha clarity",
        negative_prompt: "low quality, out of focus",
        strength: 0.6,
        guidance_scale: 8,
        num_inference_steps: 30
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
    console.log("✅ Realistic Vision Output Image URL:", result);
  }
  
  runRealisticVision();
  