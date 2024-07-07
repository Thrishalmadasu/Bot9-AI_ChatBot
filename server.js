const express = require('express');
const path = require('path');
require('dotenv').config();
const OpenAI = require('openai');
const { Message } = require('./database');
const { getRooms, bookRoom } = require('./hotelFunctions');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendBookingConfirmation(email, bookingDetails) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Hotel Booking Confirmation',
    html: `
      <h1>Booking Confirmation</h1>
      <p>Thank you for your booking. Here are your details:</p>
      <ul>
        <li>Room: ${bookingDetails.room}</li>
        <li>Price: $${bookingDetails.price} per night</li>
        <li>Nights: ${bookingDetails.nights}</li>
        <li>Total: $${bookingDetails.total}</li>
        <li>Booking ID: ${bookingDetails.bookingId}</li>
      </ul>
      <p>We look forward to your stay!</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
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
      limit: 10
    });

    const messages = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    messages.push({ role: 'user', content: message });

    
    const systemMessage = {
      role: 'system',
      content: `You are a friendly and helpful hotel booking assistant. 
      Your primary focus is to help customers book rooms and answer questions 
      related to hotel stays. Adapt your language and tone to match the customer's
      style of communication. If they use informal language or a mix of languages
      (like Hinglish), respond in a similar manner. Do not engage in conversations
      unrelated to hotel bookings or stays. If asked about unrelated topics, politely redirect the conversation 
      back to hotel-related matters.`
    };

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [systemMessage, ...messages],
      functions: [
        {
          name: "get_rooms",
          description: "Get available hotel rooms",
          parameters: { type: "object", properties: {} }
        },
        {
          name: "book_room",
          description: "Book a hotel room",
          parameters: {
            type: "object",
            properties: {
              roomId: { type: "integer" },
              fullName: { type: "string" },
              email: { type: "string" },
              nights: { type: "integer" }
            },
            required: ["roomId", "fullName", "email", "nights"]
          }
        },
        {
          name: "send_booking_email",
          description: "Send booking confirmation email",
          parameters: {
            type: "object",
            properties: {
              email: { type: "string" },
              bookingDetails: {
                type: "object",
                properties: {
                  room: { type: "string" },
                  price: { type: "number" },
                  nights: { type: "number" },
                  total: { type: "number" },
                  bookingId: { type: "string" }
                }
              }
            },
            required: ["email", "bookingDetails"]
          }
        }
      ],
      function_call: "auto",
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
          functionArgs.nights
        );
      } else if (functionName === 'send_booking_email') {
        functionResult = await sendBookingConfirmation(
          functionArgs.email,
          functionArgs.bookingDetails
        );
      }

      const secondResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          systemMessage,
          ...messages,
          response.choices[0].message,
          {
            role: "function",
            name: functionName,
            content: JSON.stringify(functionResult)
          }
        ]
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