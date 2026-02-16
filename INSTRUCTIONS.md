To get the logs from your React Native application, you can use the following methods:

**1. Using the Metro Bundler Console:**

When you run your application using `npm start` or `expo start`, a Metro Bundler window opens in your terminal. This window displays real-time logs from your application. Any `console.log()` statements in your code will appear here.

**2. Using the device's log:**

*   **For Android:** You can use `adb logcat` to view the logs from your Android device or emulator.
*   **For iOS:** You can use the Console app on your Mac to view the logs from your iOS device or simulator.

Please run your application and copy the logs that appear in the Metro Bundler console. The logs I'm particularly interested in are the ones related to socket connection and user authentication.
