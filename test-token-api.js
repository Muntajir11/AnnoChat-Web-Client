const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api/video-token';

async function testTokenAPI() {
  console.log('🧪 Testing Video Token API...\n');

  try {
    // Test 1: Normal token generation
    console.log('1️⃣ Testing normal token generation...');
    const response1 = await fetch(API_URL, { method: 'POST' });
    const data1 = await response1.json();
    
    if (response1.ok) {
      console.log('✅ Token generated successfully');
      console.log(`   Token: ${data1.token.substring(0, 16)}...`);
      console.log(`   Expires in: ${data1.expiresIn} seconds`);
      console.log(`   Signature: ${data1.signature.substring(0, 16)}...`);
    } else {
      console.log('❌ Failed to generate token');
      console.log('   Error:', data1.message);
    }

    // Test 2: Rate limiting
    console.log('\n2️⃣ Testing rate limiting...');
    const promises = [];
    for (let i = 0; i < 12; i++) {
      promises.push(fetch(API_URL, { method: 'POST' }));
    }
    
    const responses = await Promise.all(promises);
    let successCount = 0;
    let rateLimitCount = 0;
    
    for (const response of responses) {
      if (response.ok) {
        successCount++;
      } else if (response.status === 429) {
        rateLimitCount++;
      }
    }
    
    console.log(`✅ ${successCount} successful requests`);
    console.log(`🚫 ${rateLimitCount} rate-limited requests`);
    
    if (rateLimitCount > 0) {
      console.log('✅ Rate limiting is working correctly');
    } else {
      console.log('⚠️ Rate limiting might not be working');
    }

    // Test 3: GET method (should fail)
    console.log('\n3️⃣ Testing GET method (should fail)...');
    const response3 = await fetch(API_URL, { method: 'GET' });
    const data3 = await response3.json();
    
    if (response3.status === 405) {
      console.log('✅ GET method correctly rejected');
    } else {
      console.log('❌ GET method should be rejected');
    }

    console.log('\n🎉 Token API tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your Next.js server is running on localhost:3000');
  }
}

testTokenAPI();
