
# Bot9 Palace Chatbot

Bot9 Palace Chatbot is an interactive web application that assists users with hotel bookings and inquiries. It uses natural language processing to understand user queries and provide helpful responses.

## Features

- Interactive chat interface for hotel bookings and inquiries
- Integration with OpenAI's GPT-3.5 model for natural language understanding
- Real-time room availability checking
- Room booking functionality
- Automatic email confirmation for bookings
- Responsive web design

## Technologies Used

- Node.js
- Express.js
- OpenAI API
- Sequelize (assumed, based on database operations)
- Nodemailer
- HTML/CSS/JavaScript
- Axios (for frontend API calls)

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables in a `.env` file:
   ```
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password
   ```
4. Start the server:
   ```
   node server.js
   ```

## Usage

1. Open a web browser and navigate to `http://localhost:3000` (or your server's address)
2. Start chatting with the Bot9 Palace booking assistant
3. Inquire about room availability, make bookings, or ask hotel-related questions

## Dependencies

- express
- dotenv
- openai
- nodemailer
- (other dependencies as listed in package.json)

## Contributing

Contributions to improve Bot9 Palace Chatbot are welcome. Please follow these steps:

1. Fork the repository
2. Create a new branch
3. Make your changes and commit them
4. Push to your fork and submit a pull request

