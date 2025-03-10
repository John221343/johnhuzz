
import axios from 'axios';

export const apiRequest = async (method: string, url: string, data?: any) => {
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'An error occurred');
    }
    throw new Error('Network error occurred');
  }
};
