const axios = require("axios");
const fs = require("fs");

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

async function runRealVis() {
    const replicateToken = process.env.REPLICATE_API_TOKEN || "your-replicate-api-token-here";
    const inputImage = fs.readFileSync("./images/person.jpeg");
    const data = {
      version: "a6fdf14a0e5d23c43ff4032c0d8a9814cc22912e31385584d2be3a13dbf3b890",
      input: {
        image: "data:image/jpeg;base64," + inputImage.toString("base64"),
        prompt: "photorealistic male wearing sherwani, soft shadows, Nikon DSLR style",
        negative_prompt: "blurry, disfigured, distorted",
        strength: 0.5,
        num_inference_steps: 40
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
    console.log("✅ RealVisXL Output Image URL:", result);
  }
  
  runRealVis();
  