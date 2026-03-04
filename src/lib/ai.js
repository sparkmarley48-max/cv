import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const generateCVContent = async (prompt, systemPrompt = "You are a professional document writer. Use any provided context (Job Title, Company, Name) to personalize the text. If you lack specific data like years of experience or a specific industry, use clearly bracketed placeholders like [Number] or [Specific Industry]. Do NOT include preambles or meta-talk. Output the text directly.") => {
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
                max_tokens: 1000
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let content = response.data.choices[0].message.content.trim();

        // Strip common AI preambles using regex
        const preamblePatterns = [
            /^(absolutely|certainly|sure|here is|here's|i've|i have|okay|alright).*(refined|revised|improved|draft|content|letter|version)[\s:]+/i,
            /^here is the (.*):\s*/i,
            /^certainly! (.*):\s*/i
        ];

        preamblePatterns.forEach(pattern => {
            content = content.replace(pattern, '');
        });

        return content
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
