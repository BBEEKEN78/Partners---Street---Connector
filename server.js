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
      Authorization: `Bearer ${STREET_API_TOKEN}`,
      Accept: "application/json",
      "User-Agent": "Partners-Street-Connector/1.0"
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
 * Basic connection test.
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
 * Companies.
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
 * Pull companies and then request their related properties.
 *
 * Defaults to the first 5 companies so that we do not hammer
 * the Street API while we are testing.
 *
 * Example:
 * /street/companies-with-properties
 * /street/companies-with-properties?page=2
 * /street/companies-with-properties?page=1&limit=10
 */
app.get("/street/companies-with-properties", async (req, res) => {
  try {
    const page = req.query.page || 1;

    let limit = Number(req.query.limit || 5);

    if (!Number.isFinite(limit) || limit < 1) {
      limit = 5;
    }

    if (limit > 10) {
      limit = 10;
    }

    const companiesResponse = await streetGet(
      `/companies?page[number]=${encodeURIComponent(page)}`
    );

    const companies = Array.isArray(companiesResponse?.data)
      ? companiesResponse.data.slice(0, limit)
      : [];

    const results = [];

    for (const company of companies) {
      try {
        const companyWithProperties = await streetGet(
          `/companies/${encodeURIComponent(company.id)}?include=properties`
        );

        results.push({
          company_id: company.id,
          company_name: company?.attributes?.name || null,
          result: companyWithProperties
        });
      } catch (error) {
        results.push({
          company_id: company.id,
          company_name: company?.attributes?.name || null,
          error: error.message
        });
      }
    }

    res.json({
      connected: true,
      page: Number(page),
      companies_checked: results.length,
      results
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
