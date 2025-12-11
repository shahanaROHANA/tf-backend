// testProductAdd.js
// Test script to verify add product functionality with new stock validation

const API_BASE = 'http://localhost:4006/api/products';

// Test cases for stock validation
const testCases = [
  {
    name: 'Valid product with unlimited stock',
    product: {
      name: 'Test Product - Unlimited Stock',
      description: 'A test product with unlimited stock',
      priceCents: 1299, // ₹12.99
      stock: null, // unlimited
      category: 'Veg',
      deliveryTimeEstimate: '25 mins'
    },
    expected: 'success'
  },
  {
    name: 'Valid product with stock = 5',
    product: {
      name: 'Test Product - Stock 5',
      description: 'A test product with 5 items in stock',
      priceCents: 1599, // ₹15.99
      stock: 5,
      category: 'Non-Veg',
      deliveryTimeEstimate: '30 mins'
    },
    expected: 'success'
  },
  {
    name: 'Invalid product with stock = 0 (should fail)',
    product: {
      name: 'Test Product - Stock 0',
      description: 'A test product with zero stock',
      priceCents: 999, // ₹9.99
      stock: 0,
      category: 'Veg',
      deliveryTimeEstimate: '20 mins'
    },
    expected: 'fail'
  },
  {
    name: 'Invalid product with negative stock (should fail)',
    product: {
      name: 'Test Product - Negative Stock',
      description: 'A test product with negative stock',
      priceCents: 1099, // ₹10.99
      stock: -5,
      category: 'Jain',
      deliveryTimeEstimate: '15 mins'
    },
    expected: 'fail'
  },
  {
    name: 'Invalid product with empty string stock (should fail)',
    product: {
      name: 'Test Product - Empty Stock String',
      description: 'A test product with empty stock string',
      priceCents: 1199, // ₹11.99
      stock: "",
      category: 'Veg',
      deliveryTimeEstimate: '25 mins'
    },
    expected: 'fail'
  },
  {
    name: 'Invalid product with decimal stock (should fail)',
    product: {
      name: 'Test Product - Decimal Stock',
      description: 'A test product with decimal stock',
      priceCents: 1399, // ₹13.99
      stock: 10.5,
      category: 'Non-Veg',
      deliveryTimeEstimate: '35 mins'
    },
    expected: 'fail'
  }
];

async function testAddProduct(testCase, token) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📦 Product data:`, JSON.stringify(testCase.product, null, 2));
  
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testCase.product)
    });
    
    const result = await response.json();
    
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📋 Response body:`, JSON.stringify(result, null, 2));
    
    if (testCase.expected === 'success') {
      if (response.ok) {
        console.log('✅ PASS: Product created successfully');
        return true;
      } else {
        console.log('❌ FAIL: Expected success but got error');
        return false;
      }
    } else {
      if (!response.ok) {
        console.log('✅ PASS: Validation error as expected');
        return true;
      } else {
        console.log('❌ FAIL: Expected validation error but product was created');
        return false;
      }
    }
    
  } catch (error) {
    console.log('💥 ERROR:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Add Product Tests');
  console.log('=' .repeat(50));
  
  // Get token (you'll need to login first)
  const token = localStorage.getItem('sellerToken') || localStorage.getItem('token');
  
  if (!token) {
    console.log('❌ No authentication token found. Please login first.');
    console.log('💡 Run this in browser console after logging in as a seller');
    return;
  }
  
  console.log(`🔑 Using token: ${token.substring(0, 20)}...`);
  
  let passed = 0;
  let total = testCases.length;
  
  for (const testCase of testCases) {
    const result = await testAddProduct(testCase, token);
    if (result) passed++;
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Add product functionality is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the validation logic.');
  }
}

// If running in browser console
if (typeof window !== 'undefined') {
  window.runProductAddTests = runTests;
  console.log('📋 Test functions loaded. Run runProductAddTests() to start testing.');
}

// If running in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, testCases };
}