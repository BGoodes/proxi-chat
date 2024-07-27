import Main from './src/Main';
import DotEnv from 'dotenv';

// Load environment variables from .env file
DotEnv.config();

// Create a new instance of the process
new Main().init();