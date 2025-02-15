exports.handler = async (event) => {
    const apiKey = process.env.VITE_XIMILAR_API_KEY;
    
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Missing API key" }),
        };
    }

    try {
        const response = await fetch("https://api.ximilar.com/card-grader/v2/grade", {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: event.body,
        });

        const data = await response.json();
        return {
            statusCode: response.status,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Request failed", details: error.message }),
        };
    }
};
