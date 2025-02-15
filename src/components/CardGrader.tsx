import { useState, useRef } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";

type GradingResult = {
    status: {
        code: number;
        text: string;
        request_id: string;
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
    const [cameraOpen, setCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Dropzone configuration
    const { getRootProps, getInputProps } = useDropzone({
        accept: { "image/*": [] },
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

    // Open Camera
    const startCamera = async () => {
        setCameraOpen(true);
        if (videoRef.current) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;
        }
    };

    // Capture Image from Camera
    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const context = canvasRef.current.getContext("2d");
        if (context) {
            context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
            canvasRef.current.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "captured_card.jpg", { type: "image/jpeg" });
                    setImage(file);
                    setCameraOpen(false);
                }
            }, "image/jpeg");
        }

        // Stop the camera stream
        if (videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
    };

    const handleUpload = async () => {
        if (!image) return;
        setLoading(true);
        setError(null);

        try {
            console.log("Converting image to Base64...");
            const base64Image = await toBase64(image);
            const base64Data = base64Image.split(",")[1];

            console.log("Sending request to Netlify Function...");
            const response = await axios.post(
                "/.netlify/functions/cardGrader", // Call Netlify function instead of Ximilar API
                { records: [{ _base64: base64Data }] },
                { headers: { "Content-Type": "application/json" } }
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

            {/* Camera Capture Button */}
            <button
                onClick={startCamera}
                className="bg-green-500 text-white p-2 rounded-lg w-full"
            >
                Take a Picture
            </button>

            {/* Camera Preview */}
            {cameraOpen && (
                <div className="mt-4 text-center">
                    <video ref={videoRef} autoPlay className="w-full rounded-md"></video>
                    <button onClick={captureImage} className="bg-blue-500 text-white p-2 rounded-lg mt-2">
                        Capture
                    </button>
                </div>
            )}

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
            {gradingResult && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-100">
                    <h3 className="text-lg font-semibold text-center">Card Grading Results</h3>

                    {/* Card Image */}
                    <img
                        src={gradingResult.records?.[0]?._full_url_card}
                        alt="Graded Card"
                        className="w-full h-auto rounded-lg mt-2"
                    />

                    {/* Grading Details */}
                    <div className="mt-4 space-y-2">
                        <p className="text-lg font-bold">Final Grade: {gradingResult.records?.[0]?.grades.final}</p>
                        <p className="text-md">Condition: {gradingResult.records?.[0]?.grades.condition}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardGrader;
