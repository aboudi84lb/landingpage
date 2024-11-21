require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const path = require('path');
const mongoose = require('mongoose');
const Verification = require('./models/Verification'); // Import the model

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message || err);
    process.exit(1);  // Exit if MongoDB connection fails
  });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

let storedVerificationCode = null;
let storedPhoneNumber = null;  // Store phone number for validation in /verify-code

app.post('/send-verification', async (req, res) => {
  const phoneNumber = req.body.phoneNumber;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const normalizedPhoneNumber = phoneNumber.toString().replace(/\D/g, '');

  if (normalizedPhoneNumber.length !== 12) {
    return res.status(400).json({ error: 'Please provide a valid 12-digit phone number.' });
  }

  try {
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    storedVerificationCode = verificationCode;
    storedPhoneNumber = normalizedPhoneNumber; // Store phone number for verification

    const message = await client.messages.create({
      body: `Your verification code is: ${verificationCode}`,
      from: 'whatsapp:+14155238886',
      to: `whatsapp:+${normalizedPhoneNumber}`
    });

    console.log(`Sent WhatsApp message SID: ${message.sid}`);
    res.status(200).json({ message: 'Verification code sent via WhatsApp!' });
  } catch (error) {
    console.error('Error sending verification code via WhatsApp:', error);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

app.post('/verify-code', async (req, res) => {
  const { verificationCode, phoneNumber } = req.body;

  if (!phoneNumber || !verificationCode) {
    return res.status(400).json({ error: 'Phone number and verification code are required.' });
  }

  if (parseInt(verificationCode, 10) === storedVerificationCode && phoneNumber === storedPhoneNumber) {
    res.status(200).json({ message: 'Verification successful!', redirectTo: '/welcome.html' });

    // Save verification code to the database
    const newVerification = new Verification({
      phoneNumber: storedPhoneNumber,  // Use the stored phone number
      verificationCode: storedVerificationCode,
      createdAt: new Date()
    });

    try {
      await newVerification.save();
      console.log('Verification saved to database');
    } catch (error) {
      console.error('Error saving verification:', error);
      res.status(500).json({ error: 'Failed to save verification.' });
    }
  } else {
    res.status(400).json({ error: 'Invalid verification code or phone number.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
