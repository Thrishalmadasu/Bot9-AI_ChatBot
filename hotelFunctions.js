const axios = require('axios');

async function getRooms() {
  try {
    const response = await axios.get('https://bot9assignement.deno.dev/rooms');
    return response.data;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }
}

async function bookRoom(roomId, fullName, email, nights) {
  try {
    const response = await axios.post('https://bot9assignement.deno.dev/book', {
      roomId,
      fullName,
      email,
      nights
    });
    return response.data;
  } catch (error) {
    console.error('Error booking room:', error);
    throw error;
  }
}

module.exports = { getRooms, bookRoom };