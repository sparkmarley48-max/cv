import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const generateCVContent = async (prompt, systemPrompt = "You are a professional CV writer helper. Provide direct text without introductory remarks or quotation marks.") => {
    if (!GROQ_API_KEY) {
        console.error("GROQ_API_KEY is missing! Check your .env file and restart the dev server.");
        throw new Error("GROQ_API_KEY is missing");
    }

    try {
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content.trim()
            .replace(/^["'\u201C\u201D\u2018\u2019]+|["'\u201C\u201D\u2018\u2019]+$/g, '')
            .replace(/^\s*[\*\-]\s*/gm, '• ');
    } catch (error) {
        if (error.response) {
            console.error('Groq API Error Data:', error.response.data);
            console.error('Groq API Error Status:', error.response.status);
        }
        console.error('Error generating AI content:', error.message);
        throw error;
    }
};
