import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera if available
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        
        // Stop camera stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmCapture = () => {
    if (capturedImage) {
      // Convert base64 to blob
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `payment-proof-${Date.now()}.jpg`, {
            type: 'image/jpeg'
          });
          onCapture(file);
        })
        .catch(error => {
          console.error('Error converting image to file:', error);
        });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Capture Payment Proof</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button variant="primary" onClick={startCamera}>
              Try Again
            </Button>
          </div>
        ) : capturedImage ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured payment proof"
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
            <div className="flex space-x-3">
              <Button variant="ghost" onClick={retakePhoto} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button variant="primary" onClick={confirmCapture} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Use Photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-gray-700 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>
            <Button 
              variant="primary" 
              onClick={capturePhoto}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture Photo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
