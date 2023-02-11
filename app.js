const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//Create user API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser !== undefined) {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "pooji_secret_key");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

//Authentication token
authenticationToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers.authorization;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken !== undefined) {
    jwt.verify(jwtToken, "pooji_secret_key", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  } else {
    response.status(401);
    response.send("Invalid JWT Token");
  }
};

//Get states API
convertStateDBObjectAPI2 = (object) => {
  return {
    stateId: object.state_id,
    stateName: object.state_name,
    population: object.population,
  };
};
app.get("/states/", authenticationToken, async (request, response) => {
  const getStatesQuery = `SELECT * FROM state;`;
  const getStateResponse = await db.all(getStatesQuery);
  response.send(
    getStateResponse.map((object) => convertStateDBObjectAPI2(object))
  );
});

//GET state API
app.get("/states/:stateId/", authenticationToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id=${stateId};`;
  const getStateResponse = await db.get(getStateQuery);
  response.send(convertStateDBObjectAPI2(getStateResponse));
});

//Create a district API
app.post("/districts/", authenticationToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createDistrictQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths) 
  VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const createDistrictResponse = await db.run(createDistrictQuery);
  response.send("District Successfully Added");
});

//Get district API
const convertDistrictDbObjectAPI5 = (object) => {
  return {
    districtId: object.district_id,
    districtName: object.district_name,
    stateId: object.state_id,
    cases: object.cases,
    cured: object.cured,
    active: object.active,
    deaths: object.deaths,
  };
};
app.get(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `SELECT * FROM district WHERE district_id=${districtId};`;
    const getDistrictResponse = await db.get(getDistrictQuery);
    response.send(convertDistrictDbObjectAPI5(getDistrictResponse));
  }
);

//Delete district API
app.delete(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `DELETE FROM district WHERE district_id=${districtId};`;
    const deleteDistrictResponse = await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

//Update district details API
app.put(
  "/districts/:districtId/",
  authenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrictQuery = `UPDATE district SET district_name = '${districtName}',
    state_id = ${stateId},cases = ${cases},cured = ${cured},active = ${active},
    deaths = ${deaths} WHERE district_id = ${districtId};`;
    const updateDistrictResponse = await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

//GET stats of state API
app.get(
  "/states/:stateId/stats/",
  authenticationToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateStatsQuery = `SELECT SUM(cases) AS totalCases, SUM(cured) AS totalCured,
    SUM(active) AS totalActive , SUM(deaths) AS totalDeaths FROM district WHERE state_id = ${stateId};`;
    const getStateStatsResponse = await db.get(getStateStatsQuery);
    response.send(getStateStatsResponse);
  }
);
module.exports = app;
