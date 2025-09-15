import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = process.env.FASHN_API_KEY;
  
  // Тест прямого запроса к FASHN
  try {
    const testData = {
      "model_name": "tryon-v1.6",
      "inputs": {
        "model_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO/pR4kAAAAASUVORK5CYII=",
        "garment_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO/pR4kAAAAASUVORK5CYII=",
        "garment_photo_type": "auto",
        "category": "one-pieces",
        "mode": "balanced",
        "segmentation_free": true,
        "seed": 123456,
        "num_samples": 1
      }
    };

    console.log('Using API key:', apiKey?.substring(0, 10) + '...');
    
    const response = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.text();
    console.log('FASHN response status:', response.status);
    console.log('FASHN response:', result);

    return res.status(200).json({
      fashn_status: response.status,
      fashn_response: result,
      api_key_prefix: apiKey?.substring(0, 10)
    });
    
  } catch (error: any) {
    console.error('Test error:', error);
    return res.status(500).json({ 
      error: error.message,
      api_key_exists: !!apiKey 
    });
  }
}