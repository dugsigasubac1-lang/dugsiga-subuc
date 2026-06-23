import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, Video, Mic, Square, Play, Pause, Trash2, 
  UploadCloud, AlertTriangle, Check, Loader2, RefreshCw, 
  Volume2, Eye, ShieldAlert, CheckCircle, FileAudio, FileVideo, User,
  Download, ExternalLink
} from 'lucide-react';
import { Student } from '../types';
import { API_BASE } from '../config';

// Universal WAV encoding utilities to convert browser recorded audio (which is webm on many desktop browsers, etc.)
// into high-fidelity PCM Mono .wav files which are beautifully supported natively by Safari/iOS/Chrome/Firefox/Android.
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = 1; // Mono downmix works perfectly for recitations and makes WAV recordings very compact (~32KB/sec)
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const channelData = buffer.getChannelData(0); // Use the primary channel
  const bufferLength = channelData.length * 2;
  const arrayBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(arrayBuffer);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLength, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bufferLength, true);
  
  floatTo16BitPCM(view, 44, channelData);
  
  return new Blob([view], { type: 'audio/wav' });
}

interface StudentMediaModalProps {
  student: Student;
  onClose: () => void;
  onSave: (updatedStudent: Student) => void;
}

type MediaTabType = 'photo' | 'voice' | 'video';

export default function StudentMediaModal({ student, onClose, onSave }: StudentMediaModalProps) {
  const [activeTab, setActiveTab] = useState<MediaTabType>('voice');
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // States for live device streams
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Photo state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const waveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(student.imageUrl || null);
  const [capturedPhotosList, setCapturedPhotosList] = useState<string[]>(student.photos || []);
  const [tempCapturedFrame, setTempCapturedFrame] = useState<string | null>(null);

  // Voice state
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [capturedVoiceUrl, setCapturedVoiceUrl] = useState<string | null>(student.voiceUrl || null);
  const [voiceAudioPlayer, setVoiceAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);

  // Historical voices and videos tracks
  const [voicesList, setVoicesList] = useState<{ url: string; date: string; label?: string }[]>(student.voices || []);
  const [videosList, setVideosList] = useState<{ url: string; date: string; label?: string }[]>(student.videos || []);
  const [playingVoiceUrl, setPlayingVoiceUrl] = useState<string | null>(null);
  const [isListVoicePlaying, setIsListVoicePlaying] = useState(false);
  const listAudioRef = useRef<HTMLAudioElement | null>(null);

  // Video state
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const [videoChunks, setVideoChunks] = useState<Blob[]>([]);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(student.videoUrl || null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  // Refs for audio analysis/waves
  const [voiceWave, setVoiceWave] = useState<number[]>([15, 30, 10, 45, 12, 28, 5, 21, 35, 14, 40, 8, 30, 18, 25, 42, 10]);

  // Safe helper to instantiate MediaRecorder across Safari, Chrome, and Firefox
  const createMediaRecorderInstance = (mediaStream: MediaStream, type: 'audio' | 'video'): MediaRecorder => {
    const mimeTypes = type === 'audio' 
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/aac', 'audio/wav']
      : ['video/webm;codecs=vp9', 'video/webm', 'video/mp4', 'video/ogg', 'video/quicktime'];

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported by your browser.');
    }

    for (const mime of mimeTypes) {
      try {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
          console.log(`[MediaRecorder] Initializing with mimeType: ${mime}`);
          return new MediaRecorder(mediaStream, { mimeType: mime });
        }
      } catch (e) {
        console.warn(`[MediaRecorder] isTypeSupported check or instantiation failed for: ${mime}`);
      }
    }

    // Safest fallback (let custom browser choose its native recording format)
    console.log('[MediaRecorder] Fallback to default native instantiation');
    return new MediaRecorder(mediaStream);
  };

  // Handle stream cleanup on change
  useEffect(() => {
    return () => {
      stopAllMediaStreams();
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    };
  }, []);

  // Securely bind camera stream to the video element as soon as it mounts or changes
  useEffect(() => {
    if (stream && videoRef.current) {
      try {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.warn('Silent preview playback interruption handled:', err);
        });
      } catch (error) {
        console.error('Failed to bind media stream to videoRef element:', error);
      }
    }
  }, [stream, isWebcamActive, isRecording]);

  const stopAllMediaStreams = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    setIsWebcamActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (waveTimerRef.current) {
      clearInterval(waveTimerRef.current);
      waveTimerRef.current = null;
    }
  };

  // Convert Blob to Base64 String Helper
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- PHOTO RECORDER LOGIC ---
  const startCamera = async () => {
    stopAllMediaStreams();
    setStatusMsg(null);
    try {
      if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kalkuleetarka/Nidaamku ma taageerayo aaladahan. Hubi HTTPS ama ogolaanshaha amniga. (Your browser/device origin context does not support webcam inputs).');
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400 } });
      setStream(s);
      setIsWebcamActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera capture check failed', err);
      setStatusMsg({
        type: 'error',
        text: 'Kaamerada waa la xiri la’yahay. Hubi ogolaanshaha browser-ka. (Cannot access webcam. Check browser permissions).'
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 360;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setTempCapturedFrame(dataUrl);
        stopAllMediaStreams();
        setStatusMsg({
          type: 'success',
          text: 'Sawirka waa la soo qabtay! Dooro si aad u keydiso adigoo isticmaalaya badamada hoose. (Snapshot captured! Choose how you wish to save using the buttons below).'
        });
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Calaqshada sawirka way fashilantay. (Failed to capture snapshot).' });
    }
  };

  // --- AUDIO RECORDER LOGIC ---
  const startAudioRecording = async () => {
    stopAllMediaStreams();
    setStatusMsg(null);
    setRecordDuration(0);
    setAudioChunks([]);
    
    try {
      if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kalkuleetarka/Nidaamku ma taageerayo aaladahan. Hubi HTTPS ama ogolaanshaha amniga. (Your browser/device origin context does not support microphone inputs).');
      }
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(s);
      
      const recorder = createMediaRecorderInstance(s, 'audio');
      setAudioRecorder(recorder);
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunks, { type: mimeType });
        setIsUploading(true);
        try {
          let finalBlob = audioBlob;
          let filename = `student_${student.id}_voice_${Date.now()}.wav`;
          let finalMime = 'audio/wav';

          try {
            console.log('[AudioTranscoder] Decoding raw audio to convert to WAV: size =', audioBlob.size, 'type =', mimeType);
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const arrayBuffer = await audioBlob.arrayBuffer();
              const audioCtx = new AudioContextClass();
              const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
              const wavBlob = audioBufferToWav(decodedBuffer);
              if (wavBlob && wavBlob.size > 0) {
                finalBlob = wavBlob;
                console.log('[AudioTranscoder] Successful client-side conversion to universal PCM WAV format!');
              }
            } else {
              console.warn('[AudioTranscoder] AudioContext not available in this browser environment.');
            }
          } catch (transcodeErr) {
            console.warn('[AudioTranscoder] Client-side WAV transcoding failed. Falling back to native browser codec:', transcodeErr);
            const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'webm';
            filename = `student_${student.id}_voice_${Date.now()}.${ext}`;
            finalMime = mimeType;
          }

          const base64 = await blobToBase64(finalBlob);
          
          const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filename,
              fileType: finalMime,
              fileData: base64
            })
          });

          if (!response.ok) throw new Error('HTTP failure saving audio');
          const resJson = await response.json();
          
          setCapturedVoiceUrl(resJson.url);
          
          const todayStr = new Date().toISOString().split('T')[0];
          const timeStr = new Date().toLocaleTimeString('so', { hour: '2-digit', minute: '2-digit' });
          const newVoiceObj = { 
            url: resJson.url, 
            date: todayStr, 
            label: `Duubista Qur'aanka (${timeStr})` 
          };
          const updatedVoices = [newVoiceObj, ...(voicesList ?? [])];
          setVoicesList(updatedVoices);
          
          // Instantly sync into the local state
          const updated = { 
            ...student, 
            voiceUrl: resJson.url, 
            voiceDate: todayStr,
            voices: updatedVoices
          };
          onSave(updated);

          setStatusMsg({
            type: 'success',
            text: 'Codka akhriska ardayga waa la duubay si guul leh! (Student voice recitation saved successfully!)'
          });
        } catch (err) {
          console.error(err);
          setStatusMsg({ type: 'error', text: 'Duubista codka waa fashilantay xagga serverka. (Failed to save recorded audio to server).' });
        } finally {
          setIsUploading(false);
          stopAllMediaStreams();
        }
      };

      recorder.start();
      setIsRecording(true);

      // Animation simulation - clock duration updates every second
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

      // Acoustic wave bar graph animation updates every 120ms for super smooth and high-fidelity fluid motion
      waveTimerRef.current = setInterval(() => {
        setVoiceWave(Array.from({ length: 17 }, () => Math.floor(Math.random() * 45) + 5));
      }, 120);

    } catch (err) {
      console.error('Audio recorder failed', err);
      setStatusMsg({
        type: 'error',
        text: 'Makarafoonka waa la furi la’yahay. Hubi ogolaanshaha browserka. (Cannot access microphone).'
      });
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorder && isRecording) {
      audioRecorder.stop();
    }
  };

  // --- VIDEO RECORDER LOGIC ---
  const startVideoRecording = async () => {
    stopAllMediaStreams();
    setStatusMsg(null);
    setRecordDuration(0);
    setVideoChunks([]);
    
    try {
      if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kalkuleetarka/Nidaamku ma taageerayo aaladahan. Hubi HTTPS ama ogolaanshaha amniga. (Your browser/device origin context does not support camera or microphone inputs).');
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      setIsWebcamActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }

      const recorder = createMediaRecorderInstance(s, 'video');
      setVideoRecorder(recorder);
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'video/webm';
        const videoBlob = new Blob(chunks, { type: mimeType });
        setIsUploading(true);
        try {
          const base64 = await blobToBase64(videoBlob);
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('quicktime') ? 'mov' : 'webm';
          const filename = `student_${student.id}_video_${Date.now()}.${ext}`;
          
          const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filename,
              fileType: mimeType,
              fileData: base64
            })
          });

          if (!response.ok) throw new Error('HTTP failure saving video');
          const resJson = await response.json();
          
          setCapturedVideoUrl(resJson.url);
          
          const todayStr = new Date().toISOString().split('T')[0];
          const timeStr = new Date().toLocaleTimeString('so', { hour: '2-digit', minute: '2-digit' });
          const newVideoObj = { 
            url: resJson.url, 
            date: todayStr, 
            label: `Muuqaal Waxqabad (${timeStr})` 
          };
          const updatedVideos = [newVideoObj, ...(videosList ?? [])];
          setVideosList(updatedVideos);
          
          // Synced instantly
          const updated = { 
            ...student, 
            videoUrl: resJson.url, 
            videoDate: todayStr,
            videos: updatedVideos
          };
          onSave(updated);

          setStatusMsg({
            type: 'success',
            text: 'Muuqaalka ardayga waa la duubay si guul leh! (Student video milestone saved successfully!)'
          });
        } catch (err) {
          console.error(err);
          setStatusMsg({ type: 'error', text: 'Duubista muuqaalka waa fashilantay xagga serverka. (Failed to save video file).' });
        } finally {
          setIsUploading(false);
          stopAllMediaStreams();
        }
      };

      recorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Video stream failure', err);
      setStatusMsg({
        type: 'error',
        text: 'Kaamerada & Makarafoonka waa la xiri la’yahay. (Access denied to Camera and Audio device).'
      });
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorder && isRecording) {
      videoRecorder.stop();
    }
  };

  // --- MANUAL DRAG AND DROP FILE UPLOAD ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'voice' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMsg(null);

    try {
      const base64 = await blobToBase64(file);
      
      if (type === 'photo') {
        setTempCapturedFrame(base64);
        setStatusMsg({
          type: 'success',
          text: 'Faylka sawirka waa la soo akhriyay gudaha labtoobkaaga/qalabkaaga. Dooro badamada hoose si aad u keydiso. (Selected photo loaded as draft. Select how you would like to save below).'
        });
      } else {
        const fileExt = file.name.split('.').pop() || 'dat';
        const filename = `student_${student.id}_uploaded_${Date.now()}.${fileExt}`;

        const response = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename,
            fileType: file.type,
            fileData: base64
          })
        });

        if (!response.ok) throw new Error('File store fails');
        const resJson = await response.json();

        let updatedState = { ...student };
        const todayString = new Date().toISOString().split('T')[0];
        if (type === 'voice') {
          setCapturedVoiceUrl(resJson.url);
          
          const newVoiceObj = {
            url: resJson.url,
            date: todayString,
            label: `Cod la roray (${file.name})`
          };
          const updatedVoices = [newVoiceObj, ...(voicesList ?? [])];
          setVoicesList(updatedVoices);
          
          updatedState.voiceUrl = resJson.url;
          updatedState.voiceDate = todayString;
          updatedState.voices = updatedVoices;
        } else if (type === 'video') {
          setCapturedVideoUrl(resJson.url);
          
          const newVideoObj = {
            url: resJson.url,
            date: todayString,
            label: `Muuqaal la roray (${file.name})`
          };
          const updatedVideos = [newVideoObj, ...(videosList ?? [])];
          setVideosList(updatedVideos);

          updatedState.videoUrl = resJson.url;
          updatedState.videoDate = todayString;
          updatedState.videos = updatedVideos;
        }

        onSave(updatedState);
        setStatusMsg({
          type: 'success',
          text: 'Rikoorka ardayga waa la xiray laguna xaqiijiyay nidaamka. (Student files loaded and updated successfully!)'
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Ku-shubidda fashilantay. Hubi cabbirka faylka. (Failed uploading selected media file).' });
    } finally {
      setIsUploading(false);
    }
  };

  // --- SAVE DRAFT PHOTO AS STUDENT PROFILE AVATAR ---
  const handleSavePhotoAsProfile = async () => {
    const photoToSave = tempCapturedFrame;
    if (!photoToSave) return;
    setIsUploading(true);
    setStatusMsg(null);
    try {
      let finalUrl = photoToSave;
      if (photoToSave.startsWith('data:')) {
        const filename = `student_${student.id}_avatar_${Date.now()}.jpg`;
        const response = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename,
            fileType: 'image/jpeg',
            fileData: photoToSave
          })
        });

        if (!response.ok) throw new Error('profile picture upload failed');
        const resJson = await response.json();
        finalUrl = resJson.url;
      }

      setCapturedPhotoUrl(finalUrl);
      setTempCapturedFrame(null); // Clear active draft

      const updated = { 
        ...student, 
        imageUrl: finalUrl, 
        photoDate: new Date().toISOString().split('T')[0] 
      };
      onSave(updated);

      setStatusMsg({ type: 'success', text: 'Sawirka waxaa loo xaqiijiyay sidii Sawirka Profile-ka! (Saved successfully as profile picture!)' });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Muuqaalka sawirka laguma xiri Karin serverka. (Failed to save profile picture).' });
    } finally {
      setIsUploading(false);
    }
  };

  // --- SAVE DRAFT PHOTO TO THE REUSABLE STUDENT PHOTOS ALBUM ---
  const handleAddPhotoToGallery = async () => {
    const photoToSave = tempCapturedFrame;
    if (!photoToSave) return;
    setIsUploading(true);
    setStatusMsg(null);
    try {
      let finalUrl = photoToSave;
      if (photoToSave.startsWith('data:')) {
        const filename = `student_${student.id}_gallery_${Date.now()}.jpg`;
        const response = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename,
            fileType: 'image/jpeg',
            fileData: photoToSave
          })
        });

        if (!response.ok) throw new Error('extra photos catalog upload failed');
        const resJson = await response.json();
        finalUrl = resJson.url;
      }

      const updatedPhotos = [...(student.photos || []), finalUrl];
      setCapturedPhotosList(updatedPhotos);
      setTempCapturedFrame(null); // Clear active draft

      const updated = { 
        ...student, 
        photos: updatedPhotos, 
        photoDate: new Date().toISOString().split('T')[0] 
      };
      onSave(updated);

      setStatusMsg({ type: 'success', text: 'Sawirka waxaa lagu daray xusuus-qorka/gallery-ga kale ee ardayga! (Extra photo added successfully!)' });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Muuqaalka sawirka laguma xiri Karin serverka. (Failed to store photo into gallery).' });
    } finally {
      setIsUploading(false);
    }
  };

  // --- DELETE SPECIFIC GALLERY PHOTO ---
  const handleDeleteGalleryPhoto = (photoIndex: number) => {
    const updatedPhotos = (student.photos || []).filter((_, idx) => idx !== photoIndex);
    setCapturedPhotosList(updatedPhotos);
    const updated = { ...student, photos: updatedPhotos };
    onSave(updated);
    setStatusMsg({
      type: 'success',
      text: 'Sawirka waa laga masaxay gallery-ga ardayga. (Removed photo from extra photo collection).'
    });
  };

  // --- DELETE CURRENT PROFILE OR RECORD MEDIA ITEMS ---
  const handleDeleteMediaItem = (type: 'photo' | 'voice' | 'video') => {
    let updated = { ...student };
    if (type === 'photo') {
      setCapturedPhotoUrl(null);
      updated.imageUrl = '';
    } else if (type === 'voice') {
      setCapturedVoiceUrl(null);
      updated.voiceUrl = '';
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setIsVoicePlaying(false);
    } else if (type === 'video') {
      setCapturedVideoUrl(null);
      updated.videoUrl = '';
    }
    onSave(updated);
    setStatusMsg({
      type: 'success',
      text: 'Faylka waa laga saaray profile-ka ardayga. (Removed successfully from student file).'
    });
  };

  // --- HISTORICAL COLLECTION ACTIONS & LIST VOICE PLAYER ---
  const togglePlayListVoice = (url: string) => {
    if (!listAudioRef.current) return;
    const player = listAudioRef.current;
    
    const resolvedUrl = url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;

    if (playingVoiceUrl === url) {
      if (player.paused) {
        player.play().catch(e => console.error('Play list item failure:', e));
      } else {
        player.pause();
      }
    } else {
      player.pause();
      player.src = resolvedUrl;
      player.load(); // Force reload to ensure browser evaluates newly set source codec fully
      setPlayingVoiceUrl(url);
      player.play().catch(e => {
        console.error('Play list item failure:', e);
        setStatusMsg({
          type: 'error',
          text: 'Faylka ma daari karo qalabkaaga. (Native player format error).'
        });
      });
    }
  };

  const handleDeleteVoiceFromHistory = (index: number) => {
    const updated = [...voicesList];
    const deletedUrl = voicesList[index]?.url;
    updated.splice(index, 1);
    setVoicesList(updated);

    let newActiveUrl = capturedVoiceUrl;
    let newActiveDate = student.voiceDate;
    if (capturedVoiceUrl === deletedUrl) {
      newActiveUrl = '';
      newActiveDate = '';
      setCapturedVoiceUrl(null);
    }

    const updatedStudent = {
      ...student,
      voiceUrl: newActiveUrl ? newActiveUrl : '',
      voiceDate: newActiveDate ? newActiveDate : '',
      voices: updated
    };
    onSave(updatedStudent);
    setStatusMsg({
      type: 'success',
      text: 'Codkii hore waad ka saartay liiska. (Deleted historical voice from collection).'
    });
  };

  const handleDeleteVideoFromHistory = (index: number) => {
    const updated = [...videosList];
    const deletedUrl = videosList[index]?.url;
    updated.splice(index, 1);
    setVideosList(updated);

    let newActiveUrl = capturedVideoUrl;
    let newActiveDate = student.videoDate;
    if (capturedVideoUrl === deletedUrl) {
      newActiveUrl = '';
      newActiveDate = '';
      setCapturedVideoUrl(null);
    }

    const updatedStudent = {
      ...student,
      videoUrl: newActiveUrl ? newActiveUrl : '',
      videoDate: newActiveDate ? newActiveDate : '',
      videos: updated
    };
    onSave(updatedStudent);
    setStatusMsg({
      type: 'success',
      text: 'Muuqaalkii hore waad ka saartay liiska. (Deleted historical video from collection).'
    });
  };

  const handleMakeVoiceActive = (item: { url: string; date: string }) => {
    setCapturedVoiceUrl(item.url);
    const updatedStudent = {
      ...student,
      voiceUrl: item.url,
      voiceDate: item.date
    };
    onSave(updatedStudent);
    setStatusMsg({
      type: 'success',
      text: 'Codkan waxaa laga dhigay Akhriska Rasmiga ah! (Successfully selected voice recitation set as active!)'
    });
  };

  const handleMakeVideoActive = (item: { url: string; date: string }) => {
    setCapturedVideoUrl(item.url);
    const updatedStudent = {
      ...student,
      videoUrl: item.url,
      videoDate: item.date
    };
    onSave(updatedStudent);
    setStatusMsg({
      type: 'success',
      text: 'Muuqaalkan waxaa laga dhigay Muuqaalka Rasmiga ah! (Successfully set as the active behavior video!)'
    });
  };

  // --- PLAY AUDIO RECORDING ---
  const togglePlayVoice = () => {
    if (!audioPlayerRef.current || !capturedVoiceUrl) return;
    
    const player = audioPlayerRef.current;
    if (isVoicePlaying) {
      player.pause();
    } else {
      const resolvedSrc = capturedVoiceUrl.startsWith('/uploads/') ? `${API_BASE}${capturedVoiceUrl}` : capturedVoiceUrl;
      // Force reload of src to trigger resource download and source elements evaluation
      if (!player.src || !player.src.endsWith(capturedVoiceUrl)) {
        player.src = resolvedSrc;
        player.load();
      }
      player.play().catch(err => {
        console.error('Audio play failure:', err);
        setStatusMsg({ 
          type: 'error', 
          text: 'Ereyada dhawaqa ma daari karaan qalabkaaga. (Native device error playing audio format).' 
        });
      });
    }
  };

  const formattedTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-2 md:p-4 overflow-y-auto" id="student-media-modal-backdrop">
      <div className="bg-white w-full max-w-5xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-4 md:my-8 origin-center animate-scale-in max-h-[96vh] lg:h-[88vh]" id="student-media-modal">
        
        {/* Hidden robust native audio component for play-toggles */}
        <audio 
          ref={audioPlayerRef} 
          src={capturedVoiceUrl ? (capturedVoiceUrl.startsWith('/uploads/') ? `${API_BASE}${capturedVoiceUrl}` : capturedVoiceUrl) : undefined}
          onPlay={() => setIsVoicePlaying(true)}
          onPause={() => setIsVoicePlaying(false)}
          onEnded={() => setIsVoicePlaying(false)}
          className="hidden shrink-0"
        />

        {/* Dedicated audio player for previous voice list sessions */}
        <audio 
          ref={listAudioRef}
          onPlay={() => setIsListVoicePlaying(true)}
          onPause={() => setIsListVoicePlaying(false)}
          onEnded={() => {
            setIsListVoicePlaying(false);
            setPlayingVoiceUrl(null);
          }}
          className="hidden shrink-0"
        />

        {/* HEADER SECTION */}
        <div className="bg-slate-950 p-4 md:p-5 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-2xl border border-indigo-500/20 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight mb-0.5">Xarunta Warbaahinta Ardayga</h3>
              <p className="text-[11px] text-slate-400 font-bold">Dugsiga Subuc Student Media Workstation & File Archive Directory</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => {
              stopAllMediaStreams();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-xl transition-all cursor-pointer border border-slate-700"
            id="close-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PUPIL BIO ROW */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
              {capturedPhotoUrl ? (
                <img referrerPolicy="no-referrer" src={capturedPhotoUrl.startsWith('/uploads/') ? `${API_BASE}${capturedPhotoUrl}` : capturedPhotoUrl} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">{student.name}</h4>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">ID: <span className="font-black text-indigo-650">{student.id}</span> • Fasalka: <span className="font-black">{student.className}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[10px] bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg uppercase">
              Shift: {student.session || 'Both'}
            </span>
            <span className={`font-black text-[10px] px-2.5 py-1 rounded-lg border uppercase ${
              student.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              {student.active ? 'Active' : 'Suspended'}
            </span>
          </div>
        </div>

        {/* CORE WORKSTATION & DIRECTORY LAYOUT GRID */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden min-h-0" id="media-modal-body-grid">
          
          {/* LEFT COLUMN: ACTIVE CAPTURE WORKSPACE (7 col span) */}
          <div className="lg:col-span-7 flex flex-col justify-between overflow-y-auto p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-slate-200" id="workspace-column">
            
            <div className="space-y-4">
              {/* Tab Controls */}
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1" id="media-tabs-workstation">
                <button
                  type="button"
                  onClick={() => { stopAllMediaStreams(); setStatusMsg(null); setActiveTab('voice'); }}
                  className={`flex-1 py-2.5 text-xs font-extrabold text-center rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'voice' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/30'
                  }`}
                  id="tab-voice-btn"
                >
                  <Mic className="w-4 h-4 shrink-0" />
                  <span>Codka (Audio)</span>
                  {capturedVoiceUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                </button>
                
                <button
                  type="button"
                  onClick={() => { stopAllMediaStreams(); setStatusMsg(null); setActiveTab('photo'); }}
                  className={`flex-1 py-2.5 text-xs font-extrabold text-center rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'photo' 
                      ? 'bg-white text-teal-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/30'
                  }`}
                  id="tab-photo-btn"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Qaad Sawir (Camera)</span>
                  {tempCapturedFrame && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>}
                </button>

                <button
                  type="button"
                  onClick={() => { stopAllMediaStreams(); setStatusMsg(null); setActiveTab('video'); }}
                  className={`flex-1 py-2.5 text-xs font-extrabold text-center rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'video' 
                      ? 'bg-white text-rose-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/30'
                  }`}
                  id="tab-video-btn"
                >
                  <Video className="w-4 h-4 shrink-0" />
                  <span>Muuqaal (Video)</span>
                  {capturedVideoUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                </button>
              </div>

              {/* Status alerts */}
              {statusMsg && (
                <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold leading-relaxed ${
                  statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
                }`} id="status-alert-box">
                  {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />}
                  <span className="flex-1 text-[11px]">{statusMsg.text}</span>
                </div>
              )}

              {/* TAB 1: ACUSTIC VOICE RECORDER WORKSPACE */}
              {activeTab === 'voice' && (
                <div className="space-y-4" id="view-voice-workstation">
                  <div className="border border-slate-200 rounded-2xl p-5 bg-indigo-50/20 shadow-xs flex flex-col items-center justify-center min-h-[180px]">
                    {isRecording ? (
                      <div className="flex flex-col items-center space-y-4 w-full">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest bg-rose-500/10 text-rose-600 px-2.5 py-0.5 rounded-full animate-pulse">
                          Duubistu waa furantahay (Recording Active)
                        </span>

                        {/* Interactive audio waveform simulation update */}
                        <div className="flex items-end justify-center gap-1 h-14 w-full px-4" id="audio-waveforms">
                          {voiceWave.map((h, i) => (
                            <div 
                              key={i} 
                              style={{ height: `${h}%` }}
                              className="w-1.5 bg-indigo-600 rounded-full transition-all duration-100"
                            ></div>
                          ))}
                        </div>

                        <div className="text-slate-900 font-extrabold text-lg font-mono tracking-widest">{formattedTime(recordDuration)}</div>
                        
                        <button
                          type="button"
                          onClick={stopAudioRecording}
                          className="px-6 py-2.5 bg-rose-650 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95 border-b-2 border-rose-800"
                        >
                          <Square className="w-4 h-4 fill-white" />
                          <span>Jooji iyo Keydi (Stop & Save Audio)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3 w-full">
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={startAudioRecording}
                          className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-750 text-white flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-95 border border-indigo-550"
                        >
                          <Mic className="w-6 h-6 animate-pulse" />
                        </button>
                        <div className="text-center max-w-sm">
                          <p className="text-xs font-black text-slate-800">Guji si aad u duubto codka ardayga</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">U duub akhriska Qur'aanka kariimka ah, xadiisyada ama dhibcaha u gaar ah ardayga.</p>
                        </div>

                        {capturedVoiceUrl && (
                          <div className="w-full max-w-md mt-4 p-3.5 bg-white rounded-2xl border border-indigo-100/80 shadow-3xs flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1.5 self-start text-indigo-700 font-black text-[10px] tracking-wide uppercase">
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Codka Hadda Keydsan (Stored Recitation)</span>
                            </div>
                            <audio 
                              controls 
                              preload="metadata"
                              src={capturedVoiceUrl.startsWith('/uploads/') ? `${API_BASE}${capturedVoiceUrl}` : capturedVoiceUrl} 
                              className="w-full h-8 outline-none"
                            />
                            {student.voiceDate && (
                              <span className="self-end text-[8px] bg-indigo-50/55 text-indigo-700 font-bold py-0.5 px-1.5 rounded">
                                Taariikhda la duubay: {student.voiceDate}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Drag & drop or local storage selector */}
                  <div className="border border-dashed border-indigo-100 p-4 rounded-xl flex flex-col items-center justify-center bg-slate-50/50 hover:bg-indigo-50/10 transition-colors relative">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleFileUpload(e, 'voice')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <UploadCloud className="w-6 h-6 text-indigo-400 mb-1" />
                    <p className="text-[11px] text-slate-700 font-bold">Ama haddii aad haysato fayl cod ah, halkaan ku tuur</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">MP3, WAV, M4A ama WebM files (Up to 10MB)</p>
                  </div>
                </div>
              )}

              {/* TAB 2: CAMERA SNAPSHOT WORKSPACE */}
              {activeTab === 'photo' && (
                <div className="space-y-4" id="view-photo-workstation">
                  
                  {/* Camera Stage Visualizer Frame */}
                  <div className="border border-slate-200 bg-slate-950 rounded-2xl aspect-video overflow-hidden flex flex-col items-center justify-center relative shadow-inner w-full max-h-[240px]">
                    {isWebcamActive ? (
                      <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover scale-x-[-1]"
                        playsInline
                        muted
                      ></video>
                    ) : tempCapturedFrame ? (
                      <img 
                        referrerPolicy="no-referrer"
                        src={tempCapturedFrame} 
                        alt="Captured draft preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-4 text-center">
                        <User className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                        <p className="text-xs text-slate-400 font-bold">Kaamirada weydiska waa la xiray (Camera is sleeping)</p>
                        <p className="text-[10px] text-slate-500 mt-1">Start camera snapshot interface above to begin capturing pupil frame pictures.</p>
                      </div>
                    )}

                    {isWebcamActive && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-5 py-2 bg-teal-600 text-white text-xs font-black rounded-xl hover:bg-teal-700 shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Qabso Muuqaalka (Capture Snap)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Operational controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* Draft Actions Card */}
                    <div className="p-4 bg-indigo-50/25 border border-indigo-100 rounded-xl flex flex-col justify-between">
                      <div>
                        <h5 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider mb-1">Xaqiijinta Sawirka (Save Snapped Photo)</h5>
                        <p className="text-[10px] text-slate-500 leading-normal mb-3">
                          Haddii aad sawir qaaday ama aad soo gelisay halkan, dooro mid ka mid ah badamada hoose si aad ugu keydiso profile-ka ama gallery-ga.
                        </p>
                      </div>

                      {tempCapturedFrame ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={handleSavePhotoAsProfile}
                            disabled={isUploading}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-1 shadow-xs transition-transform active:scale-95"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>1. U badbaadi sidii Profile Picture</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleAddPhotoToGallery}
                            disabled={isUploading}
                            className="w-full py-2 bg-teal-650 hover:bg-teal-700 text-white text-[10px] font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-1 shadow-xs transition-transform active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>2. Ku dar Sawirrada Kale (Gallery)</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setTempCapturedFrame(null)}
                            className="w-full py-1 text-slate-550 hover:text-rose-600 text-[9px] font-bold text-center underline"
                          >
                            Tirtir qabyadan (Discard Draft)
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic text-center py-6">
                          Malaha sawir diyaar ah (No photo active to save yet).
                        </div>
                      )}
                    </div>

                    {/* Camera Activation / Upload card */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full py-2.5 border border-slate-205 text-slate-700 hover:bg-slate-50 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-teal-600" />
                        <span>{isWebcamActive ? 'Cusbooneysii Kaamirada' : 'Fur Kaamirada (Open Webcam)'}</span>
                      </button>

                      <div className="border border-dashed border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center hover:bg-slate-50 transition-colors relative flex-1 min-h-[90px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'photo')}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
                        <p className="text-[10px] text-slate-700 font-extrabold text-center">Ama halkaan ka soo xulo sawir</p>
                        <p className="text-[8px] text-slate-400 mt-0.5">JPG, PNG, WEBP max 15MB</p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 3: VIDEO MILESTONE RECORDER WORKSPACE */}
              {activeTab === 'video' && (
                <div className="space-y-4" id="view-video-workstation">
                  <div className="border border-slate-200 rounded-2xl p-4 bg-rose-50/10 flex flex-col items-center justify-center min-h-[180px]">
                    {isRecording ? (
                      <div className="flex flex-col items-center w-full space-y-3">
                        <div className="border-4 border-rose-500 rounded-2xl overflow-hidden shadow-md aspect-video w-[250px] bg-black">
                          <video 
                            ref={videoRef} 
                            className="w-full h-full object-cover scale-x-[-1]"
                            playsInline
                            muted
                          ></video>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                          <span className="text-slate-800 font-extrabold text-xs tracking-wider">Muuqaalku wuu duubmayaa: {formattedTime(recordDuration)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={stopVideoRecording}
                          className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95 border-b-2 border-rose-800"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Jooji Duubista (Stop & Auto-Save)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-3">
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={startVideoRecording}
                          className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-95 border border-rose-500"
                        >
                          <Video className="w-5 h-5 animate-pulse" />
                        </button>
                        <div className="text-center max-w-sm">
                          <p className="text-xs font-black text-slate-800">Duub Muuqaalka Waxqabadka Ardayga</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">U duub muuqaal kooban oo sheegaya meelaha uu ardaygu ku fiicanyahay ama asluubtiisa.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border border-dashed border-rose-200 p-4 rounded-xl flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileUpload(e, 'video')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <UploadCloud className="w-5 h-5 text-rose-450 mb-1" />
                    <p className="text-[10px] text-slate-700 font-extrabold">Ama soo geli muuqaal horey u duubnaa</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">MP4, WebM systems max 30MB</p>
                  </div>
                </div>
              )}

            </div>

            {/* Note banner at bottom left */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4 text-[9.5px] text-slate-400 tracking-normal flex items-start gap-1.5 leading-relaxed">
              <span className="p-0.5 bg-indigo-50 text-indigo-600 rounded shrink-0 font-bold">INFO</span>
              <span>
                Faylasha halkan lagu xaqiijiyo waxaa si toos ah loogu kaydiyaa kaararka warbixinta ardayga. Waxaad ka saari kartaa feylasha dhibka leh adiga oo isticmaalaya calaamadda tirtiridda (Trash) ee dhanka midig ah.
              </span>
            </div>

          </div>

          {/* RIGHT COLUMN: SEPARATED SAVED LIBRARIES & DOWNLOADS DIRECTORY (5 col span) */}
          <div className="lg:col-span-5 bg-slate-50 p-4 md:p-5 flex flex-col overflow-y-auto max-h-[100%] gap-4" id="media-library-column">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-4 bg-indigo-600 rounded"></span>
                Liiska Warbaahinta la Keydiyay (Saved Library)
              </span>
              <span className="text-[9px] font-mono font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                Files: {[capturedPhotoUrl, capturedVoiceUrl, capturedVideoUrl].filter(Boolean).length + capturedPhotosList.length}
              </span>
            </div>

            {/* DIRECTORY SECTION 1: MAIN PROFILE PICTURE AVATAR */}
            <div className="space-y-2" id="directory-avatar-section">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                1. Sawirka Profile-ka (Active Avatar)
              </span>

              {capturedPhotoUrl ? (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-150 overflow-hidden shrink-0 flex items-center justify-center">
                      <img referrerPolicy="no-referrer" src={capturedPhotoUrl.startsWith('/uploads/') ? `${API_BASE}${capturedPhotoUrl}` : capturedPhotoUrl} alt="Avatar thumbnail" className="w-full h-full object-cover" />
                    </div>
                    <div className="truncate text-left">
                      <p className="font-extrabold text-slate-800 text-[11px]">Primary Profile Photo</p>
                      <div className="flex items-center gap-1.5 text-[8px] text-slate-400">
                        <span className="font-mono truncate max-w-[100px] md:max-w-[180px]">{capturedPhotoUrl}</span>
                        {student.photoDate && (
                          <span className="bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-sans font-bold shrink-0">Taariikhda: {student.photoDate}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a 
                      href={capturedPhotoUrl.startsWith('/uploads/') ? `${API_BASE}${capturedPhotoUrl}` : capturedPhotoUrl}
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold rounded-md border border-slate-200 transition-all cursor-pointer inline-flex items-center gap-0.5"
                      title="View active photo"
                    >
                      <Eye className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Ma xaqiijinaysaa in aad tirtirto sawirka profile-ka?')) {
                          handleDeleteMediaItem('photo');
                        }
                      }}
                      className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md border border-rose-100 cursor-pointer transition-colors"
                      title="Delete profile picture"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 bg-white rounded-xl border border-dashed border-slate-200 text-[9px] text-slate-400 italic">
                  Avatar furan laguma hayo (No profile picture uploaded yet).
                </div>
              )}
            </div>

            {/* DIRECTORY SECTION 2: SAVED ADDITIONAL PHOTOS GALERY COLLECTION */}
            <div className="space-y-2" id="directory-gallery-section">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                2. Gallery-ga Sawirrada ({capturedPhotosList.length} Photos)
              </span>

              {capturedPhotosList.length > 0 ? (
                <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {capturedPhotosList.map((photo, index) => (
                    <div key={index} className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 border border-slate-100 shrink-0">
                          <img referrerPolicy="no-referrer" src={photo.startsWith('/uploads/') ? `${API_BASE}${photo}` : photo} alt="Gallery item" className="w-full h-full object-cover" />
                        </div>
                        <div className="truncate text-left">
                          <p className="font-extrabold text-slate-800 text-[10px]">Sawirka #{index + 1}</p>
                          <div className="flex items-center gap-1.5 text-[8px] text-slate-400">
                            <span className="font-mono truncate max-w-[110px] md:max-w-[160px]">{photo}</span>
                            {student.photoDate && (
                              <span className="bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded font-sans font-bold shrink-0">Taariikhda: {student.photoDate}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <a 
                          href={photo.startsWith('/uploads/') ? `${API_BASE}${photo}` : photo}
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold rounded-md border border-slate-200 transition-all cursor-pointer"
                          title="Open full size"
                        >
                          <Eye className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Ma xaqiijinaysaa in aad tirtirto sawirkan gallery-ga laga tirtirayo?')) {
                              handleDeleteGalleryPhoto(index);
                            }
                          }}
                          className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md border border-rose-100 cursor-pointer"
                          title="Delete photo record"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-200 text-[9px] text-slate-400 italic">
                  Majiraan sawirro dheeri ah oo ku dhex jira gallery-ga (No extra gallery photos saved yet).
                </div>
              )}
            </div>

            {/* DIRECTORY SECTION 3: RECITATION AUDIO RECORDINGS */}
            <div className="space-y-2" id="directory-audio-section">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                3. Akhriska Codka (Quranic Audios)
              </span>

              {capturedVoiceUrl ? (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col gap-2 shadow-xs">
                  
                  {/* File meta and controls */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-150 text-indigo-650 flex items-center justify-center shrink-0">
                        <Mic className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <div className="truncate text-left">
                        <p className="font-extrabold text-slate-800 text-[10px] truncate leading-tight">Codka Hadda Firfircoon (Active)</p>
                        <div className="flex items-center gap-1.5 text-[8px] text-slate-400">
                          <span className="font-mono truncate max-w-[120px] md:max-w-[160px]">{capturedVoiceUrl}</span>
                          {student.voiceDate && (
                            <span className="bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-sans font-bold shrink-0">Taariikhda: {student.voiceDate}</span>
                          )}
                        </div>
                      </div>
                    </div>

                     <div className="flex items-center gap-1 shrink-0">
                       <button
                         type="button"
                         onClick={togglePlayVoice}
                         className={`p-1 px-2.5 rounded-md text-[9px] font-extrabold border shadow-xs transition-transform active:scale-95 cursor-pointer ${
                           isVoicePlaying 
                             ? 'bg-rose-600 text-white border-rose-550' 
                             : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                         }`}
                       >
                         {isVoicePlaying ? 'Jooji' : 'Dhaqaaji (Play)'}
                       </button>
                       
                       <a 
                         href={capturedVoiceUrl.startsWith('/uploads/') ? `${API_BASE}${capturedVoiceUrl}` : capturedVoiceUrl}
                         target="_blank" 
                         rel="noreferrer"
                         download={`student_recitation_${student.name.replace(/\s+/g, '_')}.webm`}
                         className="p-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md border border-indigo-150 cursor-pointer flex items-center justify-center"
                         title="Soo Deji codka / Download Audio"
                       >
                         <Download className="w-3 h-3" />
                       </a>

                       <a 
                         href={capturedVoiceUrl.startsWith('/uploads/') ? `${API_BASE}${capturedVoiceUrl}` : capturedVoiceUrl}
                         target="_blank" 
                         rel="noreferrer"
                         className="p-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md border border-slate-200 cursor-pointer flex items-center justify-center"
                         title="Ku fur tab cusub / Open in native web player"
                       >
                         <ExternalLink className="w-3 h-3" />
                       </a>

                       <button
                         type="button"
                         onClick={() => {
                           if (confirm('Ma xaqiijinaysaa in aad tirtirto codkan darsiga ah?')) {
                             handleDeleteMediaItem('voice');
                           }
                         }}
                         className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md border border-rose-100 cursor-pointer"
                         title="Delete voice record"
                       >
                         <Trash2 className="w-3 h-3" />
                       </button>
                     </div>
                   </div>

                   {/* Native failsafe player controls directly visible to bypass secure Safari restriction */}
                   <div className="w-full bg-slate-50/80 p-1.5 rounded-xl border border-slate-100 mt-1 shadow-3xs">
                     <audio 
                       controls 
                       preload="metadata"
                       src={capturedVoiceUrl.startsWith('/uploads/') ? `${API_BASE}${capturedVoiceUrl}` : capturedVoiceUrl} 
                       className="w-full h-8 outline-none"
                     />
                   </div>
 
                   {/* Operational playback bar progress indicator */}
                   {isVoicePlaying && (
                     <div className="w-full h-1 bg-indigo-100 rounded-full overflow-hidden animate-pulse">
                       <div className="h-full bg-indigo-600 rounded-full w-3/4 animate-[shimmer_2s_infinite]"></div>
                     </div>
                   )}

                   {/* WebM Playback compatibility assistant helper for mobile/Apple devices */}
                   {capturedVoiceUrl.endsWith('.webm') && (
                     <div className="bg-amber-50 rounded-lg p-2 border border-amber-100 text-left">
                       <p className="text-[8px] font-black text-amber-800 leading-normal">
                         ⚠️ **Taageerada Aaladda (Device Playback Note):** 
                         Haddii codku kaari waayo qalabkaaga (sida iPhone/Safari), fadlan isticmaal Google Chrome ama guji calaamadda **Wada-furyo (External Link / arrow icon)** ama **Soo deji (Download)** si aad si toos ah ugu dhagaysato.
                       </p>
                     </div>
                   )}

                </div>
              ) : (
                <div className="text-center py-3 bg-white rounded-xl border border-dashed border-slate-200 text-[9px] text-slate-400 italic">
                  Cod la duubay oo hadda furan ma jiro (No recitations audio available).
                </div>
              )}

              {/* Previous recorded voices list subsection */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-200 text-left bg-slate-100/50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[9px] font-black text-indigo-950 uppercase tracking-wider block mb-1.5">
                  🕰️ Rikooradii Hore Ee La Keydiyay ({voicesList.length} codad hore)
                </span>
                {voicesList.length > 0 ? (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                    {voicesList.map((item, idx) => {
                      const isThisPlaying = playingVoiceUrl === item.url && isListVoicePlaying;
                      const isActiveRecitation = capturedVoiceUrl === item.url;
                      return (
                        <div 
                          key={idx} 
                          className={`p-1.5 rounded-lg border text-[10px] flex items-center justify-between gap-2 transition-all ${
                            isActiveRecitation 
                              ? 'bg-indigo-50 border-indigo-200 shadow-3xs' 
                              : 'bg-white border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          <div className="truncate flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActiveRecitation ? 'bg-indigo-600 animate-ping' : 'bg-slate-400'}`}></span>
                            <div className="truncate">
                              <p className="font-extrabold text-slate-800 truncate leading-tight">
                                {item.label || `Duubista #${voicesList.length - idx}`}
                              </p>
                              <span className="text-[8px] text-slate-400 font-bold">
                                Duubay: {item.date} {isActiveRecitation && ' • (Firfircoon)'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Play individual list track */}
                            <button
                              type="button"
                              onClick={() => togglePlayListVoice(item.url)}
                              className={`p-1 px-1.5 rounded text-[8px] font-extrabold border transition-all cursor-pointer ${
                                isThisPlaying 
                                  ? 'bg-rose-600 text-white border-rose-500 hover:bg-rose-700' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {isThisPlaying ? 'Jooji' : 'Codsi'}
                            </button>

                            {/* Set Active Recitation */}
                            {!isActiveRecitation && (
                              <button
                                type="button"
                                onClick={() => handleMakeVoiceActive(item)}
                                className="p-1 px-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[8px] border border-indigo-500 cursor-pointer"
                                title="U dooro midka rasmiga ah"
                              >
                                Firfirconi
                              </button>
                            )}

                            {/* External open link */}
                            <a
                              href={item.url.startsWith('/uploads/') ? `${API_BASE}${item.url}` : item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 bg-white hover:bg-slate-100 text-slate-600 rounded border border-slate-200 flex items-center justify-center cursor-pointer"
                              title="Ka furi tab cusub"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>

                            {/* Delete item */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Ma xaqiijinaysaa in aad masaxdo codkan duubista hore?')) {
                                  handleDeleteVoiceFromHistory(idx);
                                }
                              }}
                              className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded border border-rose-150 cursor-pointer"
                              title="Tirtir codkan"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-400 italic py-1 pl-1">
                    Rikooro kale oo hore laguma hayo. (No previous recorded voices in history).
                  </div>
                )}

                {/* Robust Native HTML5 Player for Historical Audio list items */}
                {playingVoiceUrl && (
                  <div className="mt-2.5 p-2 bg-indigo-50 border border-indigo-150 rounded-lg animate-fade-in text-left">
                    <span className="text-[8px] font-black text-indigo-800 uppercase tracking-wider block mb-1">
                      ▶️ Hadaad rabto in aad dhagaysato (Currently Playing Track):
                    </span>
                    <audio 
                      controls 
                      autoPlay
                      preload="auto"
                      src={playingVoiceUrl.startsWith('/uploads/') ? `${API_BASE}${playingVoiceUrl}` : playingVoiceUrl} 
                      className="w-full h-8 outline-none mt-1"
                      onPlay={() => setIsListVoicePlaying(true)}
                      onPause={() => setIsListVoicePlaying(false)}
                      onEnded={() => {
                        setIsListVoicePlaying(false);
                        setPlayingVoiceUrl(null);
                      }}
                    />
                    <div className="text-[7.5px] font-extrabold text-slate-500 mt-1 leading-normal flex items-center gap-1">
                      <span className="inline-block w-1 h-1 rounded-full bg-indigo-500"></span>
                      <span>Haddii uu badhankani kuu shaqayn waayo, fadlan riix calaamadda 📤 (muraayadda) ama soo deji.</span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* DIRECTORY SECTION 4: CLASSROOM VIDEO MILESTONES */}
            <div className="space-y-2" id="directory-video-section">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
                4. Muuqaalka Waxqabadka (Milestone Videos)
              </span>

              {capturedVideoUrl ? (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col gap-2 shadow-xs">
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-150 text-rose-650 flex items-center justify-center shrink-0">
                        <Video className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <div className="truncate text-left">
                        <p className="font-extrabold text-slate-800 text-[10px] truncate leading-tight">Muuqaalka Hadda Firfircoon</p>
                        <div className="flex items-center gap-1.5 text-[8px] text-slate-400">
                          <span className="font-mono truncate max-w-[120px] md:max-w-[160px]">{capturedVideoUrl}</span>
                          {student.videoDate && (
                            <span className="bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-sans font-bold shrink-0">Taariikhda: {student.videoDate}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a 
                        href={capturedVideoUrl.startsWith('/uploads/') ? `${API_BASE}${capturedVideoUrl}` : capturedVideoUrl}
                        target="_blank" 
                        rel="noreferrer"
                        download={`student_video_${student.name.replace(/\s+/g, '_')}.webm`}
                        className="p-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md border border-indigo-150 cursor-pointer flex items-center justify-center"
                        title="Soo deji muuqaalka / Download Video"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      
                      <a 
                        href={capturedVideoUrl.startsWith('/uploads/') ? `${API_BASE}${capturedVideoUrl}` : capturedVideoUrl}
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md border border-slate-200 cursor-pointer flex items-center justify-center gap-0.5 text-[9px] font-bold px-1.5"
                        title="Dhaqaaji / Open in native web player"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Furi</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Ma xaqiijinaysaa in aad tirtirto muuqaalkan guusha ah?')) {
                            handleDeleteMediaItem('video');
                          }
                        }}
                        className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md border border-rose-100 cursor-pointer"
                        title="Delete video record"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Mini-embed inline video player */}
                  <div className="w-full bg-slate-950 rounded-lg overflow-hidden flex flex-col items-center justify-center aspect-video max-h-[140px] border border-slate-250 relative group">
                    <video 
                      referrerPolicy="no-referrer"
                      playsInline
                      preload="metadata"
                      src={capturedVideoUrl.startsWith('/uploads/') ? `${API_BASE}${capturedVideoUrl}` : capturedVideoUrl} 
                      className="w-full h-full object-contain"
                      controls
                    ></video>
                  </div>

                  {/* WebM compatibility notice for iOS/Safari */}
                  {capturedVideoUrl.endsWith('.webm') && (
                    <div className="bg-amber-50 rounded-lg p-2 border border-amber-100 text-left">
                      <p className="text-[8px] font-black text-amber-800 leading-normal">
                        ⚠️ **Taageerada Muuqaalka (Safari compatibility):** 
                        Haddii muuqaalku kaari waayo qalabkaaga (sida iPhone/iPad/Safari), fadlan isticmaal Google Chrome ama guji calaamadda **Furi / External Link** ama **Soo deji** si aad si toos ah ugu daawato qalabkaaga dhexdiisa.
                      </p>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-3 bg-white rounded-xl border border-dashed border-slate-200 text-[9px] text-slate-400 italic">
                  Muuqaal guuleed hadda ma kaydsana (No student videos saved).
                </div>
              )}

              {/* Previous recorded videos list subsection */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-200 text-left bg-slate-100/50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[9px] font-black text-rose-955 uppercase tracking-wider block mb-1.5">
                  🕰️ Rikoorada Muuqaal ee Hore ({videosList.length} muuqaalo hore)
                </span>
                {videosList.length > 0 ? (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                    {videosList.map((item, idx) => {
                      const isActiveVideo = capturedVideoUrl === item.url;
                      return (
                        <div 
                          key={idx} 
                          className={`p-1.5 rounded-lg border text-[10px] flex items-center justify-between gap-2 transition-all ${
                            isActiveVideo 
                              ? 'bg-rose-50 border-rose-200 shadow-3xs' 
                              : 'bg-white border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          <div className="truncate flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActiveVideo ? 'bg-rose-600 animate-ping' : 'bg-slate-400'}`}></span>
                            <div className="truncate">
                              <p className="font-extrabold text-slate-800 truncate leading-tight">
                                {item.label || `Muuqaal #${videosList.length - idx}`}
                              </p>
                              <span className="text-[8px] text-slate-400 font-bold">
                                Duubay: {item.date} {isActiveVideo && ' • (Firfircoon)'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Set Active Video */}
                            {!isActiveVideo && (
                              <button
                                type="button"
                                onClick={() => handleMakeVideoActive(item)}
                                className="p-1 px-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[8px] border border-rose-500 cursor-pointer"
                                title="U dooro midka rasmiga ah"
                              >
                                Firfirconi
                              </button>
                            )}

                            {/* External open link */}
                            <a
                              href={item.url.startsWith('/uploads/') ? `${API_BASE}${item.url}` : item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 bg-white hover:bg-slate-100 text-slate-600 rounded border border-slate-200 flex items-center justify-center cursor-pointer"
                              title="Dhaqaaji / Ka furi tab cusub"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>

                            {/* Delete item */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Ma xaqiijinaysaa in aad masaxdo muuqaalkan hore?')) {
                                  handleDeleteVideoFromHistory(idx);
                                }
                              }}
                              className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded border border-rose-150 cursor-pointer"
                              title="Tirtir muuqaalkan"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-400 italic py-1 pl-1">
                    Kayd kale oo muuqaalo hore laguma hayo. (No previous recorded videos in history).
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold">
            <LockBadge />
            <span>Server-ka weyn ee Dugsiga Subuc (Central School Cloud)</span>
          </div>

          <div className="flex items-center gap-2">
            {isUploading && (
              <div className="flex items-center gap-1.5 text-indigo-750 font-black text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-600" />
                <span>Uplinking faylasha... (Uploading data...)</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => { stopAllMediaStreams(); onClose(); }}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-250 text-slate-700 rounded-xl font-extrabold cursor-pointer transition-all text-xs"
              id="footer-close-btn"
            >
              Hawsha Dhameey (Done)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function LockBadge() {
  return (
    <svg className="w-3.5 h-3.5 text-teal-600 shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2050/svg">
      <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1v-2a4 4 0 00-4-4zm3 6V6a3 3 0 00-6 0v2h6z" clipRule="evenodd"></path>
    </svg>
  );
}
