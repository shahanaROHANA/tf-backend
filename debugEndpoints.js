import fetch from 'node-fetch';

async function testEndpoints() {
  console.log('🧪 Testing endpoints with detailed logging...\n');

  // First, login as admin to get a valid token
  try {
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await fetch('http://localhost:4007/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@trainfood.com',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginData);
      return;
    }
    
    console.log('✅ Login successful, token received');
    const token = loginData.token;
    
    // Test analytics endpoint
    console.log('\n2️⃣ Testing analytics endpoint...');
    const analyticsResponse = await fetch('http://localhost:4007/api/admin/analytics?period=monthly', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Analytics response status:', analyticsResponse.status);
    const analyticsData = await analyticsResponse.json();
    console.log('Analytics response:', analyticsData);
    
    // Test cart endpoint (get cart)
    console.log('\n3️⃣ Testing cart endpoint...');
    const cartResponse = await fetch('http://localhost:4007/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Cart response status:', cartResponse.status);
    const cartData = await cartResponse.json();
    console.log('Cart response:', cartData);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

testEndpoints();