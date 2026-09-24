import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const STREET_API_TOKEN = process.env.STREET_API_TOKEN;
const STREET_BASE_URL = "https://street.co.uk/open-api/v1";

if (!STREET_API_TOKEN) {
  console.error("Missing STREET_API_TOKEN environment variable.");
  process.exit(1);
}

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Partners Street Connector"
  });
});

async function streetGet(path) {
  const response = await fetch(`${STREET_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${STREET_API_TOKEN}`,
      Accept: "application/vend.api+json"
    }
  });

  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Street API error ${response.status}: ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`
    );
  }

  return data;
}

app.get("/street/test", async (req, res) => {
  try {
    const data = await streetGet("/companies");

    res.json({
      connected: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Partners Street Connector running on port ${PORT}`);
});
