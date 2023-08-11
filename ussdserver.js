API_KEY=40e4c6b2dafd74ac3d6615f860b68f143f82eea82957f612a205395bfeb1f737
CONNECTION_STRING =mongodb+srv://simple-webber:admin@myatlasclusteredu.lkdai4s.mongodb.net/digibox?retryWrites=true&w=majority

const express = require('express');
const bodyParser = require('body-parser');
const bcryptjs = require('bcryptjs');
const AfricasTalking = require('africastalking')
require('dotenv').config()
const app = express();
const User = require('./models/usermodel')
const Document = require('./models/documentmodel');
const connectDb = require('./dbConnection/connection');

connectDb()
//Initialize Africa's talking
const africastalking = AfricasTalking({
    apiKey:process.env.API_KEY,
    username:'africasmsApp'
})

// Configure middleware
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) =>{
res.send("Oya")
})

app.get("/documents",async()=>{
    try {
        const documents = await Document.find().sort({ creationDate: -1 });
        res.json(documents);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
      }
})

app.post('/users', async (req, res) => {
    try {
      const { username, phoneNumber, password } = req.body;
      
      console.log(req.body);

      if (!username || !phoneNumber || !password) {
        return res.status(400).json({ error: 'Please fill all fields' });
      }
      const editNumber = phoneNumber.substring(1);
      // Check if user already exists
      const user = await User.findOne({ phoneNumber });
  
      if (user) {
        return res.status(400).json({ error: 'User already exists' });
      }
  
      // Hash the password
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);
      const newNumber =`254${editNumber}`
      // Save the new user
      const newUser = new User({
        username: username,
        phoneNumber: newNumber,
        password: hashedPassword,
      });
      const savedUser = await newUser.save();
  
      res.status(201).json({ message: 'User registered successfully', user: savedUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

// USSD route
app.post('/ussd',async (req, res) => {
  const sessionId = req.body.sessionId;
  const serviceCode = req.body.serviceCode;
  const phoneNumber = req.body.phoneNumber;
  const text = req.body.text.trim();

  // Your USSD logic here
  let response = '';
  if(text === '') {
  //initial Ussd Prompt
  response ='CON Welcome to DigiBox.\n';
  response += '1. Share a Document.\n';
  response += '2. Exit';
}else if(text ==='1'){
    //Ask for the Receipient Number
    response = 'CON Enter recipient Number'
}else if(text.startsWith('1*')){
    //Handle Receipient Number
    const phoneNumber = text.split('*')[1];
    // Generate a unique link for the document 
    // Remove the leading zero and replace with +254
    const recipientPhoneNumber = phoneNumber.substring(1);
    const newRecipientPhoneNumber =`+254${recipientPhoneNumber}`
    console.log( 
        newRecipientPhoneNumber,
        recipientPhoneNumber
    )
    // Generate a unique link for the document
    const documentLink = 'https://example.com/document/xyz123';
    // Compose the sms message
    const smsMessage = `Hi ${newRecipientPhoneNumber},You've received a document. Click the link to access:${documentLink}`;

    // Send the sms message using Africa's talking
    const sms = africastalking.SMS;
    const options = {
      to:newRecipientPhoneNumber,
      message: smsMessage
    };
    sms.send(options)
      .then(() => {
        response = 'END Document link has been sent via SMS.';
      })
      .catch(error => {
        console.error(error);
        response = 'END An error occurred. Please try again later.';
      });
}
else if (text === '2') {
    // Exit the USSD session
    response = 'END Thank you for using our service.';
  } else {
    // Invalid input
    response = 'CON Invalid input. Please try again.';
  }
  res.contentType('text/plain');
  res.send(response);

});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
