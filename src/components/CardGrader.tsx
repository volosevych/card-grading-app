import { useState } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";

type GradingResult = {
    status: {
        code: number;
        text: string;
        requiest_id: string;
    };
    records?: {
        _full_url_card?: string;
        grades: {
            final: number;
            condition: string;
            corners: number;
            edges: number;
            surface: number;
            centering: number;
        };
        card: [
            {
                centering: {
                    "left/right": string;
                    "top/bottom": string;
                };
            }
        ];
    }[];
    statistics: {
        "processing time": number;
    };
};

const CardGrader: React.FC = () => {
    const [image, setImage] = useState<File | null>(null);
    const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Dropzone configuration
    const { getRootProps, getInputProps } = useDropzone({
        accept: { "image/*": [] }, // Correct TypeScript format
        onDrop: (acceptedFiles: File[]) => {
            setImage(acceptedFiles[0]);
        },
    });

    // Convert image to Base64
    const toBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleUpload = async () => {
        if (!image) return;
        setLoading(true);
        setError(null);

        // Validate API Key
        const apiKey = import.meta.env.VITE_XIMILAR_API_KEY;
        if (!apiKey) {
            setError("Missing API key. Please check your .env file.");
            setLoading(false);
            return;
        }

        try {
            console.log("API Key:", apiKey);
            console.log("Converting image to Base64...");

            // Convert uploaded image to Base64
            const base64Image = await toBase64(image);
            const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

            console.log("Base64 Image Ready. Sending request to Ximilar...");

            const response = await axios.post(
                "https://api.ximilar.com/card-grader/v2/grade",
                {
                    records: [{ _base64: base64Data }]
                },
                {
                    headers: {
                        Authorization: `Token ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            console.log("API Response:", response.data);
            setGradingResult(response.data);
        } catch (error: any) {
            console.error("Error:", error.response?.data || error.message);
            setError(error.response?.data?.text || "Failed to grade the card.");
        }
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
            {/* Dropzone for Image Upload */}
            <div
                {...getRootProps()}
                className="border-2 border-dashed p-6 text-center cursor-pointer"
            >
                <input {...getInputProps()} />
                <p>Drag & drop an image or click to select</p>
            </div>

            {/* Show Image Preview */}
            {image && (
                <img src={URL.createObjectURL(image)} alt="Preview" className="w-full h-auto mt-4" />
            )}

            {/* Upload Button */}
            <button
                onClick={handleUpload}
                className={`bg-blue-500 text-white p-2 rounded-lg w-full ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={loading}
            >
                {loading ? "Grading..." : "Upload & Grade"}
            </button>

            {/* Show Error Message (If Any) */}
            {error && (
                <div className="mt-4 p-2 bg-red-200 text-red-800 rounded">
                    <p>{error}</p>
                </div>
            )}

            {/* Display Grading Results */}
            {gradingResult && gradingResult.records && gradingResult.records.length > 0 &&  (
                <div className="mt-4 p-4 border rounded-lg bg-gray-100">
                    <h3 className="text-lg font-semibold text-center">Grading Results</h3>

                    {/* Card Image */}
                    <img 
                        src={gradingResult.records[0]._full_url_card} 
                        alt="Graded Card"
                        className="w-full h-auto rounded-lg mt-2"
                    />

                    {/* Grading Details */}
                    <div className="mt-4 space-y-2">
                        <p className="text-lg font-bold">
                            Final Grade: {gradingResult.records[0].grades.final}
                        </p>
                        <p className="text-md">
                            Condition: {gradingResult.records[0].grades.condition}
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <p>🟢 Corners: {gradingResult.records[0].grades.corners}</p>
                            <p>🟢 Edges: {gradingResult.records[0].grades.edges}</p>
                            <p>🟢 Surface: {gradingResult.records[0].grades.surface}</p>
                            <p>🟢 Centering: {gradingResult.records[0].grades.centering}</p>
                        </div>

                        {/* Centering Ratio */}
                        <p className="mt-2">📏 Centering: 
                            Left/Right {gradingResult.records[0].card[0].centering["left/right"]}, 
                            Top/Bottom {gradingResult.records[0].card[0].centering["top/bottom"]}
                        </p>

                        {/* Processing Time */}
                        <p className="text-sm text-gray-600 mt-2">
                            ⏱ Processed in {gradingResult.statistics["processing time"]} seconds
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardGrader;
