const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Client } = require("pg");
//Creating an instance of Client to route to lightbnb database
const client = new Client({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb",
  port: 5432,
});

//The code below confirms the connection to the database. The front-end is using data from the /json directory, the app may appear to work even if the connection to the database is not successful.

client.connect().then(() => {
  console.log("Connected to database!");
});

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
        return result.rows[0];
      } else {
        return null;
      }
    })
    .catch((error) => console.log(error));
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
        return result.rows[0];
      } else {
        return null;
      }
    })
    .catch((error) => console.log(error));
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
      return result.rows[0];
    })
    .catch((error) => console.log(error));
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
      return result.rows;
    })
    .catch((error) => console.log(error));
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {
  limit = 10;
  const queryParams = [];

  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
    `;

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

  queryParams.push(limit);
  queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  return client
    .query(queryString, queryParams)
    .then((res) => res.rows)
    .catch((error) => console.log(error));
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  let queryString = `
  INSERT INTO properties(
    owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `;

  let values = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
  ];
  return client
    .query(queryString, values)
    .then((res) => {
      return res.rows;
    })
    .catch((error) => console.log(error));
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
