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
    method: "GET",
    headers: {
      Authorization: `Bearer ${STREET_API_TOKEN}`
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

/*
 * Basic Street connection test
 */
app.get("/street/test", async (req, res) => {
  try {
    const data = await streetGet("/companies?page[number]=1");

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

/*
 * Companies list
 */
app.get("/street/companies", async (req, res) => {
  try {
    const page = req.query.page || 1;

    const data = await streetGet(
      `/companies?page[number]=${encodeURIComponent(page)}`
    );

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

/*
 * Test related properties for one company
 */
app.get("/street/company-properties", async (req, res) => {
  try {
    const companies = await streetGet("/companies?page[number]=1");

    const firstCompany = companies?.data?.[0];

    if (!firstCompany) {
      return res.status(404).json({
        connected: true,
        error: "No company records returned by Street"
      });
    }

    const data = await streetGet(
      `/companies/${encodeURIComponent(firstCompany.id)}?include=properties`
    );

    res.json({
      connected: true,
      company_id: firstCompany.id,
      company_name: firstCompany?.attributes?.name || null,
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
