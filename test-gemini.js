// Quick test script for Gemini API
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('Testing Gemini API...');
  console.log('API Key (first 10 chars):', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
  console.log('Model:', process.env.GEMINI_MODEL || 'gemini-1.5-flash');

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Try without JSON response mode first
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    });

    console.log('\nSending test prompt...');

    const result = await model.generateContent('Say "Hello, the API is working!" in JSON format like {"message": "Hello, the API is working!"}');
    const response = await result.response;
    const text = response.text();

    console.log('\n✅ Success! Response:', text);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testGemini();
