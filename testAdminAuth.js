// Test admin authentication and analytics API

const testAdminAuth = async () => {
  const baseURL = 'http://localhost:4002';
  
  try {
    console.log('🔐 Testing admin login...');
    
    // Step 1: Login as admin
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@trainfood.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful!');
    console.log('Token:', loginData.token ? 'Received' : 'Not received');
    console.log('User role:', loginData.user?.role);

    // Step 2: Test analytics API with admin token
    console.log('\n📊 Testing analytics API...');
    const analyticsResponse = await fetch(`${baseURL}/api/admin/analytics?period=monthly`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!analyticsResponse.ok) {
      throw new Error(`Analytics API failed: ${analyticsResponse.status} ${analyticsResponse.statusText}`);
    }

    const analyticsData = await analyticsResponse.json();
    console.log('✅ Analytics API successful!');
    console.log('Analytics data:', {
      totalOrders: analyticsData.totalOrders,
      totalRevenue: analyticsData.totalRevenue,
      completionRate: analyticsData.completionRate
    });

    console.log('\n🎉 All tests passed! Admin authentication is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

testAdminAuth();
