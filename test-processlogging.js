/**
 * Test script for ProcessLogging functionality
 */

const ProcessLogging = require('./src/services/ProcessLogging');

async function testProcessLogging() {
  console.log('Testing ProcessLogging functionality...');

  try {
    // Test 1: Basic initialization
    const logger = new ProcessLogging('./test-logs');
    console.log('✓ ProcessLogging initialized successfully');

    // Test 2: Basic error logging
    await logger.logServerError(12345, 'Test error message', 'error');
    console.log('✓ Basic error logging works');

    // Test 3: Log retrieval (should return empty since no logs exist)
    const logs = await logger.getServerErrorLogs(12345);
    console.log('✓ getServerErrorLogs:', logs);

    // Test 4: Clear logs
    await logger.clearServerErrorLogs(12345);
    const clearedLogs = await logger.getServerErrorLogs(12345);
    console.log('✓ clearServerErrorLogs:', clearedLogs);

    console.log('ProcessLogging module is working correctly!');
    return true;
  } catch (error) {
    console.error('❌ ProcessLogging test failed:', error);
    return false;
  }
}

testProcessLogging().then(success => {
  if (success) {
    console.log('✅ ProcessLogging module test completed successfully');
    process.exit(0);
  } else {
    console.log('❌ ProcessLogging module test failed');
    process.exit(1);
  }
});