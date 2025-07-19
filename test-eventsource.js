const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting Puppeteer EventSource test...');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('📱 Browser Console:', msg.text()));
    page.on('pageerror', error => console.log('❌ Page Error:', error.message));
    
    console.log('🌐 Navigating to React app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    // Test EventSource connection directly
    console.log('🧪 Testing EventSource connection...');
    const eventSourceResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        console.log('🔗 Creating EventSource...');
        const eventSource = new EventSource('http://localhost:9000/api/logs');
        
        let connected = false;
        let error = null;
        
        eventSource.onopen = (event) => {
          console.log('✅ EventSource connected successfully');
          connected = true;
          resolve({ success: true, message: 'EventSource connected', readyState: eventSource.readyState });
          eventSource.close();
        };
        
        eventSource.onmessage = (event) => {
          console.log('📨 EventSource message received:', event.data);
        };
        
        eventSource.onerror = (e) => {
          console.log('❌ EventSource error:', e);
          error = e;
          resolve({ 
            success: false, 
            message: 'EventSource failed', 
            error: e.toString(),
            readyState: eventSource.readyState 
          });
          eventSource.close();
        };
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!connected) {
            console.log('⏰ EventSource timeout');
            resolve({ 
              success: false, 
              message: 'EventSource timeout',
              readyState: eventSource.readyState 
            });
            eventSource.close();
          }
        }, 10000);
      });
    });
    
    console.log('📊 EventSource test result:', eventSourceResult);
    
    // Check the UI status
    const connectionStatus = await page.evaluate(() => {
      const statusElements = document.querySelectorAll('.MuiChip-root');
      const statusTexts = Array.from(statusElements).map(el => el.textContent);
      return statusTexts;
    });
    
    console.log('📱 UI Connection Status:', connectionStatus);
    
    // Wait a bit more to see if anything changes
    await page.waitForTimeout(5000);
    
    await browser.close();
    console.log('✅ Puppeteer test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})(); 