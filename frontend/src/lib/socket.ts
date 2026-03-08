import { io } from 'socket.io-client';

// Dynamically determine the backend URL based on where the frontend is hosted
// If on localhost, use localhost:4000, if on network IP, use network IP:4000
const getURL = () => {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
};

const URL = process.env.NEXT_PUBLIC_API_URL || getURL();

export const socket = io(URL, {
  autoConnect: false,
});
