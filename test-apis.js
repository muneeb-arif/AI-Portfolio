// test-apis.js - Test script for the 3 APIs
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test URLs provided by user
const testUrls = {
  web: [
    // 'https://muneeb.theexpertways.com/',
    'https://oso.nyc/'
  ],
  figma: [
    // 'https://www.figma.com/proto/9aITbs6hlkJLzwiKeWlOM7/Travel---Tours--Copy-?page-id=0%3A1&node-id=1-2&scaling=scale-down-width',
    // 'https://www.figma.com/proto/s8QpNsOJbaxnV57Lz3ue3M/My-Medi-Logs--Copy-?node-id=28-76'
  ],
  stores: [
    // 'https://play.google.com/store/apps/details?id=com.gohomie.app&hl=en&pli=1',
    // 'https://apps.apple.com/ae/app/homie/id6450675083'
  ]
};

async function testAPI(endpoint, urls, analyze = false) {
  try {
    console.log(`\n🧪 Testing ${endpoint}...`);
    console.log(`📝 URLs: ${urls.length}`);
    console.log(`🤖 Analysis: ${analyze ? 'Enabled' : 'Disabled'}`);
    console.log(`🔗 URLs:`, urls);
    
    const response = await axios.post(`${BASE_URL}${endpoint}`, {
      urls: urls,
      analyze: analyze
    }, {
      timeout: 300000 // 5 minutes timeout
    });

    console.log(`✅ ${endpoint} - Success!`);
    console.log(`📊 Summary:`, response.data.summary);
    
    // Show detailed results
    if (response.data.results) {
      response.data.results.forEach((result, index) => {
        console.log(`\n📄 Result ${index + 1}:`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Project: ${result.projectName}`);
        console.log(`   Success: ${result.success}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        if (result.screenshot) {
          console.log(`   Screenshots:`, result.screenshot);
        }
        if (result.screenshots) {
          console.log(`   Screenshots: ${result.screenshots.length} files`);
        }
        if (result.analysis) {
          console.log(`   Analysis: Available (${result.analysis.length} characters)`);
        }
      });
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error.response?.data?.error || error.message);
    return null;
  }
}

async function testDeepCapture(endpoint, urls, analyze = false) {
  try {
    console.log(`\n🧪 Testing ${endpoint} with Deep Capture...`);
    console.log(`📝 URLs: ${urls.length}`);
    console.log(`🤖 Analysis: ${analyze ? 'Enabled' : 'Disabled'}`);
    console.log(`🔍 Deep Capture: Enabled`);
    console.log(`🔗 URLs:`, urls);
    
    const response = await axios.post(`${BASE_URL}${endpoint}`, {
      urls: urls,
      analyze: analyze,
      deep_capture: true
    }, {
      timeout: 600000 // 10 minutes timeout for deep capture
    });

    console.log(`✅ ${endpoint} - Success!`);
    console.log(`📊 Summary:`, response.data.summary);
    
    // Show detailed results
    if (response.data.results) {
      response.data.results.forEach((result, index) => {
        console.log(`\n📄 Result ${index + 1}:`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Project: ${result.projectName}`);
        console.log(`   Deep Capture: ${result.deepCapture ? 'Yes' : 'No'}`);
        console.log(`   Total URLs: ${result.totalUrls}`);
        console.log(`   Success: ${result.success}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        if (result.screenshots) {
          console.log(`   Screenshots: ${result.screenshots.length} URLs captured`);
          result.screenshots.forEach((screenshot, i) => {
            console.log(`     ${i + 1}. ${screenshot.url} - ${screenshot.success ? '✅' : '❌'}`);
          });
        }
        if (result.analysis) {
          console.log(`   Analysis: Available (${result.analysis.length} characters)`);
        }
      });
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error.response?.data?.error || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests with User Provided URLs...\n');

  // Test 1: Web screenshots without analysis
  console.log('='.repeat(60));
  console.log('🌐 TEST 1: Web Screenshots (No Analysis)');
  console.log('='.repeat(60));
  await testAPI('/api/web-screenshots', testUrls.web, false);

  // Test 2: Figma screenshots without analysis
  console.log('\n' + '='.repeat(60));
  console.log('🎨 TEST 2: Figma Screenshots (No Analysis)');
  console.log('='.repeat(60));
  await testAPI('/api/figma-screenshots', testUrls.figma, false);

  // Test 3: Store screenshots without analysis
  console.log('\n' + '='.repeat(60));
  console.log('📱 TEST 3: Store Screenshots (No Analysis)');
  console.log('='.repeat(60));
  await testAPI('/api/store-screenshots', testUrls.stores, false);

  // Test 4: Web screenshots with analysis (test with first URL only)
  console.log('\n' + '='.repeat(60));
  console.log('🤖 TEST 4: Web Screenshots (With Analysis)');
  console.log('='.repeat(60));
  await testAPI('/api/web-screenshots', testUrls.web.slice(0, 1), true);

  // Test 5: Web screenshots with deep capture (test with first URL only)
  console.log('\n' + '='.repeat(60));
  console.log('🔍 TEST 5: Web Screenshots (Deep Capture)');
  console.log('='.repeat(60));
  await testDeepCapture('/api/web-screenshots', testUrls.web.slice(0, 1), false);

  // Test 6: Figma screenshots with analysis (test with first URL only)
  console.log('\n' + '='.repeat(60));
  console.log('🤖 TEST 6: Figma Screenshots (With Analysis)');
  console.log('='.repeat(60));
  await testAPI('/api/figma-screenshots', testUrls.figma.slice(0, 1), true);

  // Test 7: Store screenshots with analysis (test with first URL only)
  console.log('\n' + '='.repeat(60));
  console.log('🤖 TEST 7: Store Screenshots (With Analysis)');
  console.log('='.repeat(60));
  await testAPI('/api/store-screenshots', testUrls.stores.slice(0, 1), true);

  console.log('\n🎉 All tests completed!');
  console.log('\n📁 Check the screenshots/ directory for generated files:');
  console.log('   screenshots/web/');
  console.log('   screenshots/figma/');
  console.log('   screenshots/stores/');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first:');
    console.error('   npm start');
    console.error('   or');
    console.error('   node server.js');
    return false;
  }
}

// Run tests if server is available
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  }
})(); 