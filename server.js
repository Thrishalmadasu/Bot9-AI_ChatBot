const express = require('express');
const path = require('path');
require('dotenv').config();
const OpenAI = require('openai');
const { Message } = require('./database');
const { getRooms, bookRoom } = require('./hotelFunctions');
const emailjs = require('@emailjs/browser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function sendBookingConfirmation(email, bookingDetails) {
  const templateParams = {
    to_email: email,
    room: bookingDetails.room,
    price: bookingDetails.price,
    nights: bookingDetails.nights,
    total: bookingDetails.total,
    booking_id: bookingDetails.bookingId,
  };

  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      templateParams,
      process.env.EMAILJS_PUBLIC_KEY
    );
    console.log('Booking confirmation email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    await Message.create({ content: message, sender: 'user', sessionId });

    const history = await Message.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']],
      limit: 30,
    });

    const messages = history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    messages.push({ role: 'user', content: message });

    const systemMessage = {
      role: 'system',
      content: `You are a friendly and helpful hotel booking assistant for Bot9 Palace. Your primary focus is to help customers book rooms and answer questions related to hotel stays. Follow these guidelines:

1. Always collect complete information for bookings:
   - Full name
   - Email address
   - Room type preference
   - Number of nights
   - Check-in date

2. If any information is missing, politely ask for it before proceeding with a booking.

3. Present room options clearly, including room type, price, and a brief description.

4. Confirm booking details with the user before finalizing.

5. Adapt your language to match the customer's style of communication. If they use informal language or a mix of languages (like Hinglish), respond similarly.

6. Answer questions about hotel amenities, policies, and local attractions.

7. If asked about unrelated topics, politely redirect the conversation back to hotel-related matters.

8. Always format room options and booking confirmations using markdown for clear, consistent structures.

Remember, your goal is to provide excellent customer service and ensure a smooth booking process for Bot9 Palace.

When presenting room options or booking confirmations, give in readable format line line by line`,
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...messages],
      functions: [
        {
          name: 'get_rooms',
          description: 'Get available hotel rooms',
          parameters: { type: 'object', properties: {} },
        },
        {
          name: 'book_room',
          description: 'Book a hotel room',
          parameters: {
            type: 'object',
            properties: {
              roomId: { type: 'integer' },
              fullName: { type: 'string' },
              email: { type: 'string' },
              nights: { type: 'integer' },
            },
            required: ['roomId', 'fullName', 'email', 'nights'],
          },
        },
        {
          name: 'send_booking_email',
          description: 'Send booking confirmation email',
          parameters: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              bookingDetails: {
                type: 'object',
                properties: {
                  room: { type: 'string' },
                  price: { type: 'number' },
                  nights: { type: 'number' },
                  total: { type: 'number' },
                  bookingId: { type: 'string' },
                },
              },
            },
            required: ['email', 'bookingDetails'],
          },
        },
      ],
      function_call: 'auto',
    });

    let botReply = response.choices[0].message.content;

    if (response.choices[0].message.function_call) {
      const functionName = response.choices[0].message.function_call.name;
      const functionArgs = JSON.parse(response.choices[0].message.function_call.arguments);

      let functionResult;
      if (functionName === 'get_rooms') {
        functionResult = await getRooms();
      } else if (functionName === 'book_room') {
        functionResult = await bookRoom(
          functionArgs.roomId,
          functionArgs.fullName,
          functionArgs.email,
          functionArgs.nights,
        );
      } else if (functionName === 'send_booking_email') {
        functionResult = await sendBookingConfirmation(
          functionArgs.email,
          functionArgs.bookingDetails,
        );
      }

      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          systemMessage,
          ...messages,
          response.choices[0].message,
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(functionResult),
          },
        ],
      });

      botReply = secondResponse.choices[0].message.content;
    }

    await Message.create({ content: botReply, sender: 'bot', sessionId });

    res.json({ reply: botReply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
