const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Client } = require("pg");

const client = new Client({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb",
  port: 5432,
});

client.connect().then(() => {
  console.log("Connected to database!");
});

//The code below confirms the connection to the database. The front-end is using data from the /json directory, the app may appear to work even if the connection to the database is not successful.

// client.query(`SELECT title FROM properties LIMIT 10;`).then((response) => {
//   console.log(response);
// });

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `
  SELECT * 
  FROM users 
  WHERE email = $1`;
  const values = [email];

  return client
    .query(queryString, values)
    .then((result) => {
      if (result.rows) {
        let user = result.rows[0];
        return Promise.resolve(user);
      } else {
        return null;
      }
    })
    .catch((err) => console.log("error", err.stack));
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `
  SELECT * 
  FROM users 
  WHERE id = $1`;
  const values = [id];

  return client
    .query(queryString, values)
    .then((result) => {
      if (result.rows) {
        let user = result.rows[0];
        return Promise.resolve(user);
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *`;
  const values = [user.name, user.email, user.password];

  return client
    .query(queryString, values)
    .then((result) => {
      let user = result.rows[0];
      return Promise.resolve(user);
    })
    .catch((err) => console.log("error", err.stack));
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
  SELECT reservations.*, properties.*, avg(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON reservations.id = property_reviews.reservation_id
  WHERE reservations.guest_id = $1
  GROUP BY reservations.id, properties.id
  ORDER BY start_date ASC
  LIMIT $2;`;
  const values = [guest_id, limit];

  return client
    .query(queryString, values)
    .then((result) => {
      let user = result.rows;
      console.log(user);
      return Promise.resolve(user);
    })
    .catch((err) => console.log("error", err.stack));
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {
  // const queryString = `SELECT * FROM properties LIMIT $1`;
  // const values = [limit];

  // return client
  //   .query(queryString, values)
  //   .then((result) => {
  //     return result.rows;
  //   })
  //   .catch((err) => console.log("error", err.stack));
  // 1
  limit = 10;
  const queryParams = [];
  // 2
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
    `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city ILIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(`%${options.owner_id}%`);
    queryString += `WHERE owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    let minPennies = Number(options.minimum_price_per_night) * 100;
    let maxPennies = Number(options.maximum_price_per_night) * 100;
    queryParams.push(minPennies);
    queryString += `AND cost_per_night >= $${queryParams.length} `;
    queryParams.push(maxPennies);
    queryString += `AND cost_per_night <= $${queryParams.length} `;
  }

  queryString += `
    GROUP BY properties.id`;

  if (options.minimum_rating) {
    let rating = Number(options.minimum_rating);
    queryParams.push(rating);
    queryString += `
    HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }

  // 4
  queryParams.push(limit);
  queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;

  // 5
  console.log(queryString, queryParams);

  // 6
  return client.query(queryString, queryParams).then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
